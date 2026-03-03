CREATE POLICY "Anon can view active members"
ON public.members FOR SELECT
TO anon
USING (active = true);