ALTER TABLE public.ebd_classes
ADD COLUMN IF NOT EXISTS min_age INTEGER,
ADD COLUMN IF NOT EXISTS max_age INTEGER,
ADD COLUMN IF NOT EXISTS next_class_id UUID REFERENCES public.ebd_classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS age_tracking_enabled BOOLEAN;

ALTER TABLE public.ebd_students
ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_ebd_students_birth_date
ON public.ebd_students(birth_date);

CREATE INDEX IF NOT EXISTS idx_ebd_classes_next_class_id
ON public.ebd_classes(next_class_id);
