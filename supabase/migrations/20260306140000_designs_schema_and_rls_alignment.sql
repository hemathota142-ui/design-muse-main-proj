-- Align designs schema + RLS for public profile viewing.

-- Ensure required columns exist.
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS preview_image text;

ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS visibility text;

ALTER TABLE public.designs
  ALTER COLUMN visibility SET DEFAULT 'private';

UPDATE public.designs
SET visibility = 'private'
WHERE visibility IS NULL;

-- Keep visibility values constrained.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'designs_visibility_allowed_chk'
      AND conrelid = 'public.designs'::regclass
  ) THEN
    ALTER TABLE public.designs
      ADD CONSTRAINT designs_visibility_allowed_chk
      CHECK (visibility IN ('public', 'private'));
  END IF;
END
$$;

-- Ensure user_id references auth.users(id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'designs_user_id_fkey'
      AND conrelid = 'public.designs'::regclass
  ) THEN
    ALTER TABLE public.designs
      ADD CONSTRAINT designs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Ensure RLS enabled.
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Reset SELECT policies for designs and enforce required read rules.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'designs'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.designs', pol.policyname);
  END LOOP;
END
$$;

-- Policy 1: users can read their own designs.
CREATE POLICY designs_select_own
ON public.designs
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

-- Policy 2: anyone can read public designs.
CREATE POLICY designs_select_public
ON public.designs
FOR SELECT
TO public
USING (
  visibility = 'public'
);
