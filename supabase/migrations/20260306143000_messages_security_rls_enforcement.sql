-- Enforce messaging security rules directly in RLS policies.
-- Note: friends table uses requester_id/receiver_id to represent user/friend pairs.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_participants ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_only ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_to_accepted_friend ON public.messages;

-- Rule 4: users can only fetch their own conversations.
CREATE POLICY messages_select_participants
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
  )
);

-- Rules 1-3: insert only when sender is authenticated user
-- and friendship is accepted in either direction.
CREATE POLICY messages_insert_sender_to_accepted_friend
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = sender_id AND f.receiver_id = receiver_id)
        OR
        (f.requester_id = receiver_id AND f.receiver_id = sender_id)
      )
  )
);
