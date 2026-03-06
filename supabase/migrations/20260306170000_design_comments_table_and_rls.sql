-- Public design comments table + RLS policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.design_comments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_comments
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.design_comments
  ADD COLUMN IF NOT EXISTS design_id uuid;

ALTER TABLE public.design_comments
  ADD COLUMN IF NOT EXISTS comment_text text;

ALTER TABLE public.design_comments
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_comments_user_id_fkey'
      AND conrelid = 'public.design_comments'::regclass
  ) THEN
    ALTER TABLE public.design_comments
      ADD CONSTRAINT design_comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_comments_design_id_fkey'
      AND conrelid = 'public.design_comments'::regclass
  ) THEN
    ALTER TABLE public.design_comments
      ADD CONSTRAINT design_comments_design_id_fkey
      FOREIGN KEY (design_id) REFERENCES public.designs(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS design_comments_design_id_idx
  ON public.design_comments (design_id, created_at DESC);

CREATE INDEX IF NOT EXISTS design_comments_user_id_idx
  ON public.design_comments (user_id);

ALTER TABLE public.design_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS design_comments_insert_own ON public.design_comments;
CREATE POLICY design_comments_insert_own
ON public.design_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS design_comments_select_public_designs ON public.design_comments;
CREATE POLICY design_comments_select_public_designs
ON public.design_comments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.designs d
    WHERE d.id = design_comments.design_id
      AND (d.visibility = 'public' OR COALESCE(d.is_public, false) = true)
  )
);
