
-- Create pastor_announcements table
CREATE TABLE public.pastor_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  target_societies uuid[] DEFAULT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_by jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.pastor_announcements ENABLE ROW LEVEL SECURITY;

-- Pastor/admin can insert
CREATE POLICY "Pastor can create announcements"
ON public.pastor_announcements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pastor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Pastor/admin can view all
CREATE POLICY "Pastor can view announcements"
ON public.pastor_announcements
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view announcements targeted to them
CREATE POLICY "Members can view targeted announcements"
ON public.pastor_announcements
FOR SELECT
USING (target_societies IS NULL OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.society_id = ANY(target_societies)
));

-- Pastor/admin can update (for read_by tracking)
CREATE POLICY "Pastor can update announcements"
ON public.pastor_announcements
FOR UPDATE
USING (has_role(auth.uid(), 'pastor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Members can update read_by
CREATE POLICY "Members can mark as read"
ON public.pastor_announcements
FOR UPDATE
USING (true);

-- Create index
CREATE INDEX idx_pastor_announcements_created_at ON public.pastor_announcements(created_at DESC);
