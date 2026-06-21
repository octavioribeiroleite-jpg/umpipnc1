-- Remove old per-teacher model
DROP TABLE IF EXISTS public.ebd_teachers CASCADE;

-- Password per class
CREATE TABLE public.ebd_class_passwords (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL UNIQUE REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ebd_class_passwords_pin_hash_key ON public.ebd_class_passwords (pin_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_class_passwords TO authenticated;
GRANT ALL ON public.ebd_class_passwords TO service_role;

ALTER TABLE public.ebd_class_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can view class passwords"
ON public.ebd_class_passwords FOR SELECT TO authenticated
USING (public.has_management_role(auth.uid()));

CREATE POLICY "Management can insert class passwords"
ON public.ebd_class_passwords FOR INSERT TO authenticated
WITH CHECK (public.has_management_role(auth.uid()));

CREATE POLICY "Management can update class passwords"
ON public.ebd_class_passwords FOR UPDATE TO authenticated
USING (public.has_management_role(auth.uid()))
WITH CHECK (public.has_management_role(auth.uid()));

CREATE POLICY "Management can delete class passwords"
ON public.ebd_class_passwords FOR DELETE TO authenticated
USING (public.has_management_role(auth.uid()));

CREATE TRIGGER update_ebd_class_passwords_updated_at
BEFORE UPDATE ON public.ebd_class_passwords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Access log: who entered each class
CREATE TABLE public.ebd_class_logins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  teacher_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ebd_class_logins_date_idx ON public.ebd_class_logins (date);

GRANT SELECT ON public.ebd_class_logins TO authenticated;
GRANT ALL ON public.ebd_class_logins TO service_role;

ALTER TABLE public.ebd_class_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can view class logins"
ON public.ebd_class_logins FOR SELECT TO authenticated
USING (public.has_management_role(auth.uid()));