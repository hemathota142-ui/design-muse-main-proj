-- Fix messaging insert reliability and keep only latest 10 messages per pair.

-- RLS insert policy:
-- Keep it minimal (sender must be auth user) and let trigger enforce friendship.
DROP POLICY IF EXISTS messages_insert_sender_to_accepted_friend ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_only ON public.messages;
CREATE POLICY messages_insert_sender_only
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = sender_id
);

-- Keep only latest 10 messages per conversation pair after each insert.
CREATE OR REPLACE FUNCTION public.messages_prune_to_last_10()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.messages m
  WHERE m.id IN (
    SELECT old.id
    FROM public.messages old
    WHERE LEAST(old.sender_id, old.receiver_id) = LEAST(NEW.sender_id, NEW.receiver_id)
      AND GREATEST(old.sender_id, old.receiver_id) = GREATEST(NEW.sender_id, NEW.receiver_id)
      AND old.id NOT IN (
        SELECT keep.id
        FROM public.messages keep
        WHERE LEAST(keep.sender_id, keep.receiver_id) = LEAST(NEW.sender_id, NEW.receiver_id)
          AND GREATEST(keep.sender_id, keep.receiver_id) = GREATEST(NEW.sender_id, NEW.receiver_id)
        ORDER BY keep.created_at DESC, keep.id DESC
        LIMIT 10
      )
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS messages_prune_to_last_10_trg ON public.messages;
CREATE TRIGGER messages_prune_to_last_10_trg
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.messages_prune_to_last_10();
