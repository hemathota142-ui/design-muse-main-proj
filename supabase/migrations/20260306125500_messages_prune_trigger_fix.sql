-- Fix ambiguity in prune trigger query aliases.

CREATE OR REPLACE FUNCTION public.messages_prune_to_last_10()
RETURNS trigger
LANGUAGE plpgsql
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
