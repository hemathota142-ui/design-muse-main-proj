-- Remove redundant index ordering duplicates.
-- Keeping status-first indexes for request lists and pair uniqueness for relationship checks.
DROP INDEX IF EXISTS public.friends_requester_status_idx;
DROP INDEX IF EXISTS public.friends_receiver_status_idx;
