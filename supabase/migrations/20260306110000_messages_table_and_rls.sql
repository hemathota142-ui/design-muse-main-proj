-- Messages system for accepted friends only.

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_no_self_chk CHECK (sender_id <> receiver_id),
  CONSTRAINT messages_non_empty_chk CHECK (length(trim(message)) > 0)
);

CREATE INDEX IF NOT EXISTS messages_sender_receiver_created_idx
  ON public.messages (sender_id, receiver_id, created_at);

CREATE INDEX IF NOT EXISTS messages_receiver_sender_created_idx
  ON public.messages (receiver_id, sender_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

-- Clean up to avoid policy overlaps in local/dev iterations.
DROP POLICY IF EXISTS messages_select_participants ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_to_accepted_friend ON public.messages;

-- Participants can read their own messages only.
CREATE POLICY messages_select_participants
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
);

-- Sender can insert only when friendship is accepted.
CREATE POLICY messages_insert_sender_to_accepted_friend
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = sender_id
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
