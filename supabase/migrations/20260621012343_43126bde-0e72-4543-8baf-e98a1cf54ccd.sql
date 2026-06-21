CREATE TABLE public.ebd_teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  pin_hash text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ebd_teachers_pin_hash_key ON public.ebd_teachers (pin_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_teachers TO authenticated;
GRANT ALL ON public.ebd_teachers TO service_role;

ALTER TABLE public.ebd_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can view teachers"
ON public.ebd_teachers FOR SELECT TO authenticated
USING (public.has_management_role(auth.uid()));

CREATE POLICY "Management can insert teachers"
ON public.ebd_teachers FOR INSERT TO authenticated
WITH CHECK (public.has_management_role(auth.uid()));

CREATE POLICY "Management can update teachers"
ON public.ebd_teachers FOR UPDATE TO authenticated
USING (public.has_management_role(auth.uid()))
WITH CHECK (public.has_management_role(auth.uid()));

CREATE POLICY "Management can delete teachers"
ON public.ebd_teachers FOR DELETE TO authenticated
USING (public.has_management_role(auth.uid()));

CREATE TRIGGER update_ebd_teachers_updated_at
BEFORE UPDATE ON public.ebd_teachers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();