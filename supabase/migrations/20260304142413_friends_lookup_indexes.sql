-- Task 3: optional improvement - indexes for common friends lookups

CREATE INDEX IF NOT EXISTS friends_requester_status_idx
  ON public.friends (requester_id, status);

CREATE INDEX IF NOT EXISTS friends_receiver_status_idx
  ON public.friends (receiver_id, status);
