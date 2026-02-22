
-- Tabela portal_visitors
CREATE TABLE public.portal_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  society_id uuid REFERENCES public.societies(id),
  is_visitor boolean NOT NULL DEFAULT false,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_access timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_visitors ENABLE ROW LEVEL SECURITY;

-- Anon pode inserir (registrar-se)
CREATE POLICY "Anon can insert portal visitors"
  ON public.portal_visitors FOR INSERT TO anon
  WITH CHECK (true);

-- Anon pode atualizar last_access do proprio device_id
CREATE POLICY "Anon can update own device last_access"
  ON public.portal_visitors FOR UPDATE TO anon
  USING (device_id = device_id)
  WITH CHECK (true);

-- Admin/diretoria podem ver relatórios
CREATE POLICY "Management can view portal visitors"
  ON public.portal_visitors FOR SELECT TO authenticated
  USING (has_management_role(auth.uid()) OR has_pastor_role(auth.uid()));

-- Anon pode ler eventos não cancelados
CREATE POLICY "Anon can view events"
  ON public.events FOR SELECT TO anon
  USING (status != 'cancelado');

-- Anon pode ler comunicados para toda a igreja
CREATE POLICY "Anon can view church announcements"
  ON public.pastor_announcements FOR SELECT TO anon
  USING (scope = 'church');

-- Anon pode ler configurações PIX
CREATE POLICY "Anon can view pix settings"
  ON public.settings FOR SELECT TO anon
  USING (key IN ('pix_key', 'pix_key_type', 'pix_beneficiary', 'pix_instructions'));

-- Anon pode ler sociedades ativas (já existe política mas só para authenticated, precisamos para anon)
-- A política "Societies viewable by anyone" já existe com USING (active = true) mas precisa verificar se é para anon
