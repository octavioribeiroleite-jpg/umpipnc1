
-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Anon can insert portal visitors" ON public.portal_visitors;
DROP POLICY IF EXISTS "Authenticated can insert portal visitors" ON public.portal_visitors;
DROP POLICY IF EXISTS "Anon can update own device last_access" ON public.portal_visitors;
DROP POLICY IF EXISTS "Management can view portal visitors" ON public.portal_visitors;

-- Recreate as PERMISSIVE
CREATE POLICY "Anon can insert portal visitors"
  ON public.portal_visitors FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert portal visitors"
  ON public.portal_visitors FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can update own device last_access"
  ON public.portal_visitors FOR UPDATE TO anon
  USING (device_id = ((current_setting('request.headers'::text))::json ->> 'x-device-id'::text))
  WITH CHECK (true);

CREATE POLICY "Authenticated can update own device last_access"
  ON public.portal_visitors FOR UPDATE TO authenticated
  USING (device_id = ((current_setting('request.headers'::text))::json ->> 'x-device-id'::text))
  WITH CHECK (true);

CREATE POLICY "Management can view portal visitors"
  ON public.portal_visitors FOR SELECT TO authenticated
  USING (has_management_role(auth.uid()) OR has_pastor_role(auth.uid()));
