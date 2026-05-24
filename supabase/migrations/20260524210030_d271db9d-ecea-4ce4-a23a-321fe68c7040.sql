CREATE TABLE public.ebd_class_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  date date NOT NULL,
  visitor_count integer NOT NULL DEFAULT 0,
  marked_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (class_id, date)
);

ALTER TABLE public.ebd_class_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view class visitors"
  ON public.ebd_class_visitors FOR SELECT
  USING (true);

CREATE POLICY "Anon can insert class visitors"
  ON public.ebd_class_visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update class visitors"
  ON public.ebd_class_visitors FOR UPDATE
  USING (true);

CREATE POLICY "Anon can delete class visitors"
  ON public.ebd_class_visitors FOR DELETE
  USING (true);

CREATE TRIGGER trg_ebd_class_visitors_updated
  BEFORE UPDATE ON public.ebd_class_visitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();