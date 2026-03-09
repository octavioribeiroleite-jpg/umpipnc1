
CREATE POLICY "Anon can view aniversariantes"
ON public.aniversariantes
FOR SELECT
TO anon
USING (true);
