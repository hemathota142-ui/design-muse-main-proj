REVOKE ALL ON FUNCTION public.list_people_discovery() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_people_discovery() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_people_discovery() TO authenticated;
