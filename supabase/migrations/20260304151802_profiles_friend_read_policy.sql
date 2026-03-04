-- Ensure profiles RLS is enabled (safe if already enabled).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add friendship-based read access without removing existing own-profile access policy.
DROP POLICY IF EXISTS "Users can read accepted friends profiles" ON public.profiles;
CREATE POLICY "Users can read accepted friends profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.receiver_id = profiles.id)
        OR
        (f.receiver_id = auth.uid() AND f.requester_id = profiles.id)
      )
  )
);
