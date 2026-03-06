-- Performance indexes for message insert trigger + conversation lookups.

CREATE INDEX IF NOT EXISTS messages_pair_created_idx
  ON public.messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at DESC,
    id DESC
  );
