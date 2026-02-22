CREATE POLICY "Authenticated can insert portal visitors"
  ON portal_visitors FOR INSERT TO authenticated
  WITH CHECK (true);