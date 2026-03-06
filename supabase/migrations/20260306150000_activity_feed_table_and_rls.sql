-- Activity feed table + RLS policies
-- Supports activity types:
-- - design_shared
-- - design_liked

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  design_id uuid NULL REFERENCES public.designs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.activity_feed
  ADD COLUMN IF NOT EXISTS activity_type text;

ALTER TABLE public.activity_feed
  ADD COLUMN IF NOT EXISTS design_id uuid;

ALTER TABLE public.activity_feed
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.activity_feed
  ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activity_feed_user_id_fkey'
      AND conrelid = 'public.activity_feed'::regclass
  ) THEN
    ALTER TABLE public.activity_feed
      ADD CONSTRAINT activity_feed_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activity_feed_design_id_fkey'
      AND conrelid = 'public.activity_feed'::regclass
  ) THEN
    ALTER TABLE public.activity_feed
      ADD CONSTRAINT activity_feed_design_id_fkey
      FOREIGN KEY (design_id) REFERENCES public.designs(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activity_feed_activity_type_chk'
      AND conrelid = 'public.activity_feed'::regclass
  ) THEN
    ALTER TABLE public.activity_feed
      ADD CONSTRAINT activity_feed_activity_type_chk
      CHECK (activity_type IN ('design_shared', 'design_liked'));
  END IF;
END $$;

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_feed_insert_own ON public.activity_feed;
CREATE POLICY activity_feed_insert_own
ON public.activity_feed
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS activity_feed_select_self_and_friends ON public.activity_feed;

DO $$
DECLARE
  friend_condition text;
BEGIN
  -- Support both friends schemas:
  -- 1) requester_id / receiver_id (current app)
  -- 2) user_id / friend_id (requested shape)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'friends'
      AND column_name = 'requester_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'friends'
      AND column_name = 'receiver_id'
  ) THEN
    friend_condition := $cond$
      EXISTS (
        SELECT 1
        FROM public.friends f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.receiver_id = activity_feed.user_id)
            OR
            (f.receiver_id = auth.uid() AND f.requester_id = activity_feed.user_id)
          )
      )
    $cond$;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'friends'
      AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'friends'
      AND column_name = 'friend_id'
  ) THEN
    friend_condition := $cond$
      EXISTS (
        SELECT 1
        FROM public.friends f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = activity_feed.user_id)
            OR
            (f.friend_id = auth.uid() AND f.user_id = activity_feed.user_id)
          )
      )
    $cond$;
  ELSE
    friend_condition := 'FALSE';
  END IF;

  EXECUTE format(
    'CREATE POLICY activity_feed_select_self_and_friends
     ON public.activity_feed
     FOR SELECT
     TO authenticated
     USING (
       auth.uid() IS NOT NULL
       AND (
         activity_feed.user_id = auth.uid()
         OR %s
       )
     )',
    friend_condition
  );
END $$;

CREATE INDEX IF NOT EXISTS activity_feed_user_created_idx
  ON public.activity_feed (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_feed_design_idx
  ON public.activity_feed (design_id);
