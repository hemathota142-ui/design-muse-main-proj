-- Task 1: required safety constraints for public.friends

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'friends_status_allowed_chk'
      AND conrelid = 'public.friends'::regclass
  ) THEN
    ALTER TABLE public.friends
      ADD CONSTRAINT friends_status_allowed_chk
      CHECK (status IN ('pending', 'accepted', 'rejected'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'friends_no_self_request_chk'
      AND conrelid = 'public.friends'::regclass
  ) THEN
    ALTER TABLE public.friends
      ADD CONSTRAINT friends_no_self_request_chk
      CHECK (requester_id <> receiver_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'friends_requester_receiver_unique'
      AND conrelid = 'public.friends'::regclass
  ) THEN
    ALTER TABLE public.friends
      ADD CONSTRAINT friends_requester_receiver_unique
      UNIQUE (requester_id, receiver_id);
  END IF;
END
$$;
