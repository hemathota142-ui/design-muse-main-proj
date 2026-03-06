-- Create activity feed entries when a design becomes public.
-- Inserts:
--   user_id = design owner
--   activity_type = 'design_shared'
--   design_id = design id

CREATE OR REPLACE FUNCTION public.handle_design_shared_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_is_public boolean;
  old_is_public boolean;
BEGIN
  new_is_public := COALESCE(NEW.is_public, false) OR NEW.visibility = 'public';
  old_is_public := COALESCE(OLD.is_public, false) OR OLD.visibility = 'public';

  IF TG_OP = 'INSERT' THEN
    IF new_is_public THEN
      INSERT INTO public.activity_feed (user_id, activity_type, design_id)
      VALUES (NEW.user_id, 'design_shared', NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF new_is_public AND NOT old_is_public THEN
      INSERT INTO public.activity_feed (user_id, activity_type, design_id)
      VALUES (NEW.user_id, 'design_shared', NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_shared_activity ON public.designs;
CREATE TRIGGER trg_design_shared_activity
AFTER INSERT OR UPDATE ON public.designs
FOR EACH ROW
EXECUTE FUNCTION public.handle_design_shared_activity();
