-- Table: aniversariantes
CREATE TABLE public.aniversariantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia integer NOT NULL,
  mes integer NOT NULL,
  departamento text DEFAULT 'IPNC',
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  pendente_revisao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aniversariantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view aniversariantes" ON public.aniversariantes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Management can manage aniversariantes" ON public.aniversariantes
  FOR ALL TO authenticated USING (has_management_role(auth.uid()))
  WITH CHECK (has_management_role(auth.uid()));

CREATE TRIGGER update_aniversariantes_updated_at
  BEFORE UPDATE ON public.aniversariantes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_aniversariante_date()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mes < 1 OR NEW.mes > 12 THEN
    RAISE EXCEPTION 'Mês inválido: %', NEW.mes;
  END IF;
  IF NEW.dia < 1 THEN
    RAISE EXCEPTION 'Dia inválido: %', NEW.dia;
  END IF;
  IF NEW.mes IN (1,3,5,7,8,10,12) AND NEW.dia > 31 THEN
    RAISE EXCEPTION 'Dia inválido para o mês %: %', NEW.mes, NEW.dia;
  END IF;
  IF NEW.mes IN (4,6,9,11) AND NEW.dia > 30 THEN
    RAISE EXCEPTION 'Dia inválido para o mês %: %', NEW.mes, NEW.dia;
  END IF;
  IF NEW.mes = 2 AND NEW.dia > 29 THEN
    RAISE EXCEPTION 'Dia inválido para fevereiro: %', NEW.dia;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_aniversariante_date_trigger
  BEFORE INSERT OR UPDATE ON public.aniversariantes
  FOR EACH ROW EXECUTE FUNCTION validate_aniversariante_date();

-- Table: notificacoes_aniversarios
CREATE TABLE public.notificacoes_aniversarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL,
  referencia_data date NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes_aniversarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view notificacoes" ON public.notificacoes_aniversarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update notificacoes" ON public.notificacoes_aniversarios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Management can manage notificacoes" ON public.notificacoes_aniversarios
  FOR ALL TO authenticated USING (has_management_role(auth.uid()))
  WITH CHECK (has_management_role(auth.uid()));