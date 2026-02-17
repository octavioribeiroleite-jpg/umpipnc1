
-- 1. Tabela de sociedades
CREATE TABLE public.societies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#10b981',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Societies viewable by authenticated" ON public.societies FOR SELECT USING (true);
CREATE POLICY "Admins can manage societies" ON public.societies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Dados iniciais
INSERT INTO public.societies (name, slug, color) VALUES
  ('UMP', 'ump', '#3b82f6'),
  ('SAF', 'saf', '#ec4899'),
  ('UPH', 'uph', '#10b981'),
  ('UPA', 'upa', '#f97316'),
  ('UCP', 'ucp', '#8b5cf6');

-- 2. Tabela de cache de resumos do pastor
CREATE TABLE public.pastor_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  summaries jsonb DEFAULT '{}'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  meetings_data jsonb DEFAULT '[]'::jsonb,
  events_data jsonb DEFAULT '[]'::jsonb,
  plenaries_data jsonb DEFAULT '[]'::jsonb,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  invalidated boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pastor_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pastor and admin can read summaries" ON public.pastor_summaries FOR SELECT
  USING (has_pastor_role(auth.uid()) OR has_management_role(auth.uid()));

CREATE POLICY "Service role manages summaries" ON public.pastor_summaries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Função de invalidação do cache
CREATE OR REPLACE FUNCTION public.invalidate_pastor_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pastor_summaries SET invalidated = true;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Triggers de invalidação em 7 tabelas
CREATE TRIGGER invalidate_cache_meetings
  AFTER INSERT OR UPDATE OR DELETE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();

CREATE TRIGGER invalidate_cache_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();

CREATE TRIGGER invalidate_cache_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();

CREATE TRIGGER invalidate_cache_membership_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.membership_payments
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();

CREATE TRIGGER invalidate_cache_members
  AFTER INSERT OR UPDATE OR DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();

CREATE TRIGGER invalidate_cache_events
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();

CREATE TRIGGER invalidate_cache_plenaries
  AFTER INSERT OR UPDATE OR DELETE ON public.plenaries
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_pastor_cache();
