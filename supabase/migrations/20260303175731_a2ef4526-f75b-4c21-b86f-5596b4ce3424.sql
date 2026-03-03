
-- Pastor can manage ALL events (insert, update, delete)
CREATE POLICY "Pastor can manage all events"
ON public.events
FOR ALL
TO authenticated
USING (has_pastor_role(auth.uid()))
WITH CHECK (has_pastor_role(auth.uid()));
