
-- Remover politicas restritivas
DROP POLICY "Anon can insert portal visitors" ON portal_visitors;
DROP POLICY "Anon can update own device last_access" ON portal_visitors;
DROP POLICY "Management can view portal visitors" ON portal_visitors;

-- Recriar como PERMISSIVE
CREATE POLICY "Anon can insert portal visitors"
  ON portal_visitors FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update own device last_access"
  ON portal_visitors FOR UPDATE TO anon
  USING (device_id = current_setting('request.headers')::json->>'x-device-id')
  WITH CHECK (true);

CREATE POLICY "Management can view portal visitors"
  ON portal_visitors FOR SELECT TO authenticated
  USING (has_management_role(auth.uid()) OR has_pastor_role(auth.uid()));
