-- Task 2: optional improvement - updated_at maintenance for public.friends

ALTER TABLE public.friends
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_friends_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friends_set_updated_at ON public.friends;

CREATE TRIGGER friends_set_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.set_friends_updated_at();
