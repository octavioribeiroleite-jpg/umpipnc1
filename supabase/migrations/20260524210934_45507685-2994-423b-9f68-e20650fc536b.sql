
CREATE TABLE public.ebd_class_visitor_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL,
  date date NOT NULL,
  name text,
  marked_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ebd_class_visitor_entries_class_date ON public.ebd_class_visitor_entries(class_id, date);

ALTER TABLE public.ebd_class_visitor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visitor entries"
  ON public.ebd_class_visitor_entries FOR SELECT USING (true);

CREATE POLICY "Anon can insert visitor entries"
  ON public.ebd_class_visitor_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update visitor entries"
  ON public.ebd_class_visitor_entries FOR UPDATE USING (true);

CREATE POLICY "Anon can delete visitor entries"
  ON public.ebd_class_visitor_entries FOR DELETE USING (true);

-- Migrate existing aggregate counts into anonymous entries
INSERT INTO public.ebd_class_visitor_entries (class_id, date, name, marked_by)
SELECT v.class_id, v.date, NULL, v.marked_by
FROM public.ebd_class_visitors v
CROSS JOIN LATERAL generate_series(1, GREATEST(v.visitor_count, 0)) AS gs
WHERE v.visitor_count > 0;
