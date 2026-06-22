-- Add optional birth year to birthday records
ALTER TABLE public.aniversariantes
ADD COLUMN IF NOT EXISTS ano_nascimento integer;

ALTER TABLE public.aniversariantes
DROP CONSTRAINT IF EXISTS aniversariantes_ano_nascimento_check;

ALTER TABLE public.aniversariantes
ADD CONSTRAINT aniversariantes_ano_nascimento_check
CHECK (ano_nascimento IS NULL OR ano_nascimento BETWEEN 1900 AND 2100);

-- Ensure the API roles have the required table privileges.
GRANT SELECT ON TABLE public.aniversariantes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.aniversariantes TO authenticated;
GRANT ALL ON TABLE public.aniversariantes TO service_role;

-- Replace the broad policy with explicit policies for each write operation.
DROP POLICY IF EXISTS "Management can manage aniversariantes" ON public.aniversariantes;
DROP POLICY IF EXISTS "Management can insert aniversariantes" ON public.aniversariantes;
DROP POLICY IF EXISTS "Management can update aniversariantes" ON public.aniversariantes;
DROP POLICY IF EXISTS "Management can delete aniversariantes" ON public.aniversariantes;

CREATE POLICY "Management can insert aniversariantes"
ON public.aniversariantes
FOR INSERT
TO authenticated
WITH CHECK (public.has_management_role(auth.uid()));

CREATE POLICY "Management can update aniversariantes"
ON public.aniversariantes
FOR UPDATE
TO authenticated
USING (public.has_management_role(auth.uid()))
WITH CHECK (public.has_management_role(auth.uid()));

CREATE POLICY "Management can delete aniversariantes"
ON public.aniversariantes
FOR DELETE
TO authenticated
USING (public.has_management_role(auth.uid()));
