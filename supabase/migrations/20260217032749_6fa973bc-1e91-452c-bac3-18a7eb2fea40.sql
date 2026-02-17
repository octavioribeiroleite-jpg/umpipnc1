
-- Fix: Replace overly permissive "Members can mark as read" policy
DROP POLICY "Members can mark as read" ON public.pastor_announcements;

CREATE POLICY "Authenticated can mark as read"
ON public.pastor_announcements
FOR UPDATE
USING (
  target_societies IS NULL OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.society_id = ANY(target_societies)
  )
);
