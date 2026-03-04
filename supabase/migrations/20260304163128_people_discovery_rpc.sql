-- Safe discovery source for People list.
-- Exposes only minimal fields and keeps profiles RLS unchanged.
CREATE OR REPLACE FUNCTION public.list_people_discovery()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    u.id,
    COALESCE(
      NULLIF(p.full_name, ''),
      NULLIF(u.raw_user_meta_data->>'full_name', ''),
      NULLIF(u.raw_user_meta_data->>'display_name', ''),
      NULLIF(u.raw_user_meta_data->>'name', ''),
      split_part(COALESCE(u.email, ''), '@', 1),
      left(u.id::text, 8)
    ) AS display_name,
    COALESCE(
      NULLIF(u.raw_user_meta_data->>'avatar', ''),
      NULLIF(u.raw_user_meta_data->>'avatar_url', '')
    ) AS avatar
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE auth.uid() IS NOT NULL
    AND u.id <> auth.uid();
$$;

REVOKE ALL ON FUNCTION public.list_people_discovery() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_people_discovery() TO authenticated;
