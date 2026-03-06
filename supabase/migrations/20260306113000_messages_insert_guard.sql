-- Hard guard for message inserts:
-- 1) sender must match auth.uid()
-- 2) sender and receiver must be accepted friends

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
