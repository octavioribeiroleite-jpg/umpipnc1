-- Allow anonymous users to view societies (needed for login screen)
CREATE POLICY "Societies viewable by anyone"
ON public.societies
FOR SELECT
TO anon
USING (active = true);