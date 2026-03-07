-- Repair possible table-name drift (messagess -> messages) and stabilize messaging RLS behavior.

DO $$
DECLARE
  has_messages boolean;
  has_messagess boolean;
  has_messagess_read_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'messages'
  )
  INTO has_messages;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'messagess'
  )
  INTO has_messagess;

  IF has_messagess THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'messagess'
        AND column_name = 'read_at'
    )
    INTO has_messagess_read_at;
  END IF;

  IF has_messagess AND NOT has_messages THEN
    EXECUTE 'ALTER TABLE public.messagess RENAME TO messages';
  ELSIF has_messagess AND has_messages THEN
    IF has_messagess_read_at THEN
      EXECUTE '
        INSERT INTO public.messages (id, sender_id, receiver_id, message, created_at, read_at)
        SELECT s.id, s.sender_id, s.receiver_id, s.message, s.created_at, s.read_at
        FROM public.messagess s
        ON CONFLICT (id) DO NOTHING
      ';
    ELSE
      EXECUTE '
        INSERT INTO public.messages (id, sender_id, receiver_id, message, created_at)
        SELECT s.id, s.sender_id, s.receiver_id, s.message, s.created_at
        FROM public.messagess s
        ON CONFLICT (id) DO NOTHING
      ';
    END IF;

    EXECUTE 'DROP TABLE public.messagess';
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'messages'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'messages_no_self_chk'
        AND conrelid = 'public.messages'::regclass
    ) THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_no_self_chk CHECK (sender_id <> receiver_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'messages_non_empty_chk'
        AND conrelid = 'public.messages'::regclass
    ) THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_non_empty_chk CHECK (length(trim(message)) > 0);
    END IF;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS messages_sender_receiver_created_idx
  ON public.messages (sender_id, receiver_id, created_at);

CREATE INDEX IF NOT EXISTS messages_receiver_sender_created_idx
  ON public.messages (receiver_id, sender_id, created_at);

CREATE INDEX IF NOT EXISTS messages_unread_lookup_idx
  ON public.messages (receiver_id, sender_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_pair_created_idx
  ON public.messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at DESC
  );

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_participants ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_only ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_to_accepted_friend ON public.messages;
DROP POLICY IF EXISTS messages_update_receiver_read_receipt ON public.messages;

CREATE POLICY messages_select_participants
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (sender_id = auth.uid() OR receiver_id = auth.uid())
);

CREATE POLICY messages_insert_sender_to_accepted_friend
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = sender_id AND f.receiver_id = receiver_id)
        OR
        (f.requester_id = receiver_id AND f.receiver_id = sender_id)
      )
  )
);

CREATE POLICY messages_update_receiver_read_receipt
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = receiver_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = receiver_id);

CREATE OR REPLACE FUNCTION public.messages_guard_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.sender_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'sender_id must match authenticated user';
  END IF;

  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Cannot send message to yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = NEW.sender_id AND f.receiver_id = NEW.receiver_id)
        OR
        (f.requester_id = NEW.receiver_id AND f.receiver_id = NEW.sender_id)
      )
  ) THEN
    RAISE EXCEPTION 'You can only message accepted friends';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_insert_trg ON public.messages;
CREATE TRIGGER messages_guard_insert_trg
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.messages_guard_insert();

CREATE OR REPLACE FUNCTION public.messages_guard_update_read_receipt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Only the receiver can update read receipts';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at can be updated on messages';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_update_read_receipt_trg ON public.messages;
CREATE TRIGGER messages_guard_update_read_receipt_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.messages_guard_update_read_receipt();

CREATE OR REPLACE FUNCTION public.messages_prune_to_last_10()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.messages m
  WHERE m.id IN (
    SELECT msg_old.id
    FROM public.messages AS msg_old
    WHERE LEAST(msg_old.sender_id, msg_old.receiver_id) = LEAST(NEW.sender_id, NEW.receiver_id)
      AND GREATEST(msg_old.sender_id, msg_old.receiver_id) = GREATEST(NEW.sender_id, NEW.receiver_id)
      AND msg_old.id NOT IN (
        SELECT msg_keep.id
        FROM public.messages AS msg_keep
        WHERE LEAST(msg_keep.sender_id, msg_keep.receiver_id) = LEAST(NEW.sender_id, NEW.receiver_id)
          AND GREATEST(msg_keep.sender_id, msg_keep.receiver_id) = GREATEST(NEW.sender_id, NEW.receiver_id)
        ORDER BY msg_keep.created_at DESC, msg_keep.id DESC
        LIMIT 10
      )
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.messages_prune_to_last_10() FROM PUBLIC;

DROP TRIGGER IF EXISTS messages_prune_to_last_10_trg ON public.messages;
CREATE TRIGGER messages_prune_to_last_10_trg
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.messages_prune_to_last_10();
