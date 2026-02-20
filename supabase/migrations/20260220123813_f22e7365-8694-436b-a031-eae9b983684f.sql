
-- Drop existing event policies that conflict
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
DROP POLICY IF EXISTS "Diretoria can update own society events" ON public.events;
DROP POLICY IF EXISTS "Diretoria can insert own society events" ON public.events;
DROP POLICY IF EXISTS "Diretoria can delete own society events" ON public.events;
DROP POLICY IF EXISTS "Events viewable by authenticated" ON public.events;

-- Recreate as PERMISSIVE (default) so only ONE needs to pass
CREATE POLICY "Events viewable by authenticated"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all events"
  ON public.events FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Diretoria can insert own society events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'diretoria') AND ((society_id IS NULL) OR is_event_society_member(auth.uid(), society_id)));

CREATE POLICY "Diretoria can update own society events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'diretoria') AND is_event_society_member(auth.uid(), society_id))
  WITH CHECK (has_role(auth.uid(), 'diretoria') AND is_event_society_member(auth.uid(), society_id));

CREATE POLICY "Diretoria can delete own society events"
  ON public.events FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'diretoria') AND is_event_society_member(auth.uid(), society_id));
