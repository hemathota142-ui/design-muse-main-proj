-- Read receipts for messages: unread counts + last message preview support.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS messages_unread_lookup_idx
  ON public.messages (receiver_id, sender_id, read_at, created_at DESC);

DROP POLICY IF EXISTS messages_update_receiver_read_receipt ON public.messages;
CREATE POLICY messages_update_receiver_read_receipt
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = receiver_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = receiver_id);

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
