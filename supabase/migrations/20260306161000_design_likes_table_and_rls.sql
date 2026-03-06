-- Public design likes table + RLS policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.design_likes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_likes
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.design_likes
  ADD COLUMN IF NOT EXISTS design_id uuid;

ALTER TABLE public.design_likes
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_likes_user_id_fkey'
      AND conrelid = 'public.design_likes'::regclass
  ) THEN
    ALTER TABLE public.design_likes
      ADD CONSTRAINT design_likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_likes_design_id_fkey'
      AND conrelid = 'public.design_likes'::regclass
  ) THEN
    ALTER TABLE public.design_likes
      ADD CONSTRAINT design_likes_design_id_fkey
      FOREIGN KEY (design_id) REFERENCES public.designs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_likes_user_design_unique'
      AND conrelid = 'public.design_likes'::regclass
  ) THEN
    ALTER TABLE public.design_likes
      ADD CONSTRAINT design_likes_user_design_unique
      UNIQUE (user_id, design_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS design_likes_design_id_idx
  ON public.design_likes (design_id);

CREATE INDEX IF NOT EXISTS design_likes_user_id_idx
  ON public.design_likes (user_id);

ALTER TABLE public.design_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS design_likes_insert_own ON public.design_likes;
CREATE POLICY design_likes_insert_own
ON public.design_likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS design_likes_select_public_designs ON public.design_likes;
CREATE POLICY design_likes_select_public_designs
ON public.design_likes
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.designs d
    WHERE d.id = design_likes.design_id
      AND (d.visibility = 'public' OR COALESCE(d.is_public, false) = true)
  )
);
