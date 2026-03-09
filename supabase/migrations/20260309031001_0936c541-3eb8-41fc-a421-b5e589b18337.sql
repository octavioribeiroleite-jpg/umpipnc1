
CREATE TABLE public.ebd_day_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  closed_by text NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  total_students int NOT NULL DEFAULT 0,
  present_students int NOT NULL DEFAULT 0,
  class_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ebd_day_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view closures" ON public.ebd_day_closures FOR SELECT USING (true);
CREATE POLICY "Anon can insert closures" ON public.ebd_day_closures FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can update closures" ON public.ebd_day_closures FOR UPDATE USING (true);
CREATE POLICY "Anon can delete closures" ON public.ebd_day_closures FOR DELETE USING (true);
CREATE POLICY "Authenticated can manage closures" ON public.ebd_day_closures FOR ALL USING (has_management_role(auth.uid()));
