-- PR 1: segurança do portal do membro.
-- Mantém a diretoria com acesso completo à própria sociedade, mas impede que
-- uma sessão comum de membro leia dados financeiros da sociedade inteira.

ALTER TABLE public.member_payment_submissions
  ADD COLUMN IF NOT EXISTS charge_id uuid REFERENCES public.charges(id),
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS receipt_path text;

CREATE INDEX IF NOT EXISTS idx_member_payment_submissions_charge_id
  ON public.member_payment_submissions(charge_id);

DROP POLICY IF EXISTS "Society isolated SELECT charges" ON public.charges;
CREATE POLICY "Society isolated SELECT charges" ON public.charges FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = charges.member_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Society isolated SELECT transactions" ON public.transactions;
CREATE POLICY "Society isolated SELECT transactions" ON public.transactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
);

DROP POLICY IF EXISTS "Financial settings viewable by authenticated" ON public.financial_settings;
DROP POLICY IF EXISTS "Society isolated SELECT financial_settings" ON public.financial_settings;
CREATE POLICY "Society isolated SELECT financial_settings" ON public.financial_settings FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR has_role(auth.uid(), 'diretoria'::app_role)
);

DROP POLICY IF EXISTS "Society isolated SELECT members" ON public.members;
CREATE POLICY "Society isolated SELECT members" ON public.members FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
  OR user_id = auth.uid()
);
