-- =========================================================
-- PRECHECK: required columns must exist on public.friends
-- =========================================================
DO $$
DECLARE
  missing_cols text[];
BEGIN
  SELECT ARRAY(
    SELECT c
    FROM unnest(ARRAY['id','requester_id','receiver_id','status','created_at']) AS c
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class t ON t.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'friends'
        AND a.attname = c
        AND a.attnum > 0
        AND NOT a.attisdropped
    )
  ) INTO missing_cols;

  IF array_length(missing_cols, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required columns in public.friends: %', missing_cols;
  END IF;
END
$$;

-- =========================================================
-- REQUIRED CONSTRAINTS
-- =========================================================

-- Prevent self-friendship.
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

-- Restrict status values to pending/accepted/rejected.
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

-- Prevent direct duplicate requests (A -> B duplicated).
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

-- Prevent reversed duplicates (A -> B and B -> A).
CREATE UNIQUE INDEX IF NOT EXISTS friends_pair_unique_idx
  ON public.friends (
    LEAST(requester_id, receiver_id),
    GREATEST(requester_id, receiver_id)
  );

-- =========================================================
-- REQUIRED INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS friends_status_requester_idx
  ON public.friends (status, requester_id);

CREATE INDEX IF NOT EXISTS friends_status_receiver_idx
  ON public.friends (status, receiver_id);

-- =========================================================
-- DB GUARDRAIL: only status updates, once, pending -> accepted/rejected
-- =========================================================
CREATE OR REPLACE FUNCTION public.friends_guard_status_only_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Block updates to immutable business columns.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only status can be updated on public.friends';
  END IF;

  -- Allow the status transition only once and only from pending.
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Status can only be changed from pending';
  END IF;

  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'New status must be accepted or rejected';
  END IF;

  IF NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Status must change';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friends_guard_status_only_update_trg ON public.friends;
CREATE TRIGGER friends_guard_status_only_update_trg
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.friends_guard_status_only_update();

-- =========================================================
-- RLS ENABLEMENT
-- =========================================================
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends FORCE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Remove all existing policies on public.friends to avoid policy overlap.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'friends'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.friends', pol.policyname);
  END LOOP;
END
$$;

-- SELECT: only requester or receiver can read.
CREATE POLICY friends_select_participants
ON public.friends
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (auth.uid() = requester_id OR auth.uid() = receiver_id)
);

-- INSERT: authenticated user only; requester_id must be auth.uid(); status must be pending.
CREATE POLICY friends_insert_requester_only
ON public.friends
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND requester_id = auth.uid()
  AND requester_id <> receiver_id
  AND status = 'pending'
);

-- UPDATE: only receiver can update; only pending -> accepted/rejected.
CREATE POLICY friends_update_receiver_status_only
ON public.friends
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = receiver_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = receiver_id
  AND status IN ('accepted', 'rejected')
);
