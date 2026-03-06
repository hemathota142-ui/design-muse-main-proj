-- Extend activity feed for engagement events:
-- - design_liked
-- - design_commented
-- and auto-create feed rows when likes/comments are added.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activity_feed_activity_type_chk'
      AND conrelid = 'public.activity_feed'::regclass
  ) THEN
    ALTER TABLE public.activity_feed
      DROP CONSTRAINT activity_feed_activity_type_chk;
  END IF;
END $$;

ALTER TABLE public.activity_feed
  ADD CONSTRAINT activity_feed_activity_type_chk
  CHECK (activity_type IN ('design_shared', 'design_liked', 'design_commented'));

CREATE OR REPLACE FUNCTION public.handle_design_liked_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  design_is_public boolean;
BEGIN
  SELECT (COALESCE(d.is_public, false) OR d.visibility = 'public')
  INTO design_is_public
  FROM public.designs d
  WHERE d.id = NEW.design_id;

  IF COALESCE(design_is_public, false) THEN
    INSERT INTO public.activity_feed (user_id, activity_type, design_id)
    VALUES (NEW.user_id, 'design_liked', NEW.design_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_liked_activity ON public.design_likes;
CREATE TRIGGER trg_design_liked_activity
AFTER INSERT ON public.design_likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_design_liked_activity();

CREATE OR REPLACE FUNCTION public.handle_design_commented_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  design_is_public boolean;
BEGIN
  SELECT (COALESCE(d.is_public, false) OR d.visibility = 'public')
  INTO design_is_public
  FROM public.designs d
  WHERE d.id = NEW.design_id;

  IF COALESCE(design_is_public, false) THEN
    INSERT INTO public.activity_feed (user_id, activity_type, design_id)
    VALUES (NEW.user_id, 'design_commented', NEW.design_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_commented_activity ON public.design_comments;
CREATE TRIGGER trg_design_commented_activity
AFTER INSERT ON public.design_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_design_commented_activity();
