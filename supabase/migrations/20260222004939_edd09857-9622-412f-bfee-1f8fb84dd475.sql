
-- Allow pastors and admins to delete feedback
CREATE POLICY "Pastor and admin can delete feedback"
ON public.pastor_feedback
FOR DELETE
USING (has_pastor_role(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_management_role(auth.uid()));
