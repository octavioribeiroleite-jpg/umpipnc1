
-- Add scope column to pastor_announcements
ALTER TABLE public.pastor_announcements ADD COLUMN scope text NOT NULL DEFAULT 'societies';

-- Add created_by_role column
ALTER TABLE public.pastor_announcements ADD COLUMN created_by_role text NOT NULL DEFAULT 'pastor';

-- Update INSERT policy to allow diretoria
DROP POLICY IF EXISTS "Pastor can create announcements" ON public.pastor_announcements;
CREATE POLICY "Pastor and diretoria can create announcements"
ON public.pastor_announcements FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'diretoria'::app_role)
);

-- Also allow diretoria to view announcements targeted to their society
DROP POLICY IF EXISTS "Members can view targeted announcements" ON public.pastor_announcements;
CREATE POLICY "Members can view targeted announcements"
ON public.pastor_announcements FOR SELECT TO authenticated
USING (
  (scope = 'church')
  OR (target_societies IS NULL)
  OR (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.society_id = ANY(pastor_announcements.target_societies)
  ))
);
