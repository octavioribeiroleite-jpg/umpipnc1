-- Faixas etárias e transição entre as turmas da EBD
ALTER TABLE public.ebd_classes
  ADD COLUMN IF NOT EXISTS min_age INTEGER,
  ADD COLUMN IF NOT EXISTS max_age INTEGER,
  ADD COLUMN IF NOT EXISTS next_class_id UUID,
  ADD COLUMN IF NOT EXISTS age_tracking_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.ebd_students
  ADD COLUMN IF NOT EXISTS birth_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ebd_classes_next_class_id_fkey'
  ) THEN
    ALTER TABLE public.ebd_classes
      ADD CONSTRAINT ebd_classes_next_class_id_fkey
      FOREIGN KEY (next_class_id)
      REFERENCES public.ebd_classes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ebd_classes_age_range_check'
  ) THEN
    ALTER TABLE public.ebd_classes
      ADD CONSTRAINT ebd_classes_age_range_check
      CHECK (
        min_age IS NULL
        OR (
          min_age >= 0
          AND (max_age IS NULL OR max_age >= min_age)
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ebd_students_birth_date
  ON public.ebd_students(birth_date);

UPDATE public.ebd_classes
SET min_age = 0, max_age = 3, age_tracking_enabled = true
WHERE lower(name) = lower('Cordeirinhos do Senhor');

UPDATE public.ebd_classes
SET min_age = 4, max_age = 5, age_tracking_enabled = true
WHERE lower(name) = lower('Brilho Celeste');

UPDATE public.ebd_classes
SET min_age = 6, max_age = 8, age_tracking_enabled = true
WHERE lower(name) = lower('Rosa de Saron');

UPDATE public.ebd_classes
SET min_age = 9, max_age = 11, age_tracking_enabled = true
WHERE lower(name) = lower('Joias de Cristo');

UPDATE public.ebd_classes
SET min_age = 12, max_age = 17, age_tracking_enabled = true
WHERE lower(name) = lower('Geração do Senhor');

UPDATE public.ebd_classes
SET min_age = 18, max_age = 34, age_tracking_enabled = true
WHERE lower(name) = lower('Vencedores por Cristo');

UPDATE public.ebd_classes
SET min_age = 35, max_age = NULL, age_tracking_enabled = true
WHERE lower(name) = lower('Heróis da Fé');

UPDATE public.ebd_classes
SET min_age = NULL, max_age = NULL, next_class_id = NULL, age_tracking_enabled = false
WHERE lower(name) = lower('Oficiais');

UPDATE public.ebd_classes current_class
SET next_class_id = next_class.id
FROM public.ebd_classes next_class
WHERE lower(current_class.name) = lower('Cordeirinhos do Senhor')
  AND lower(next_class.name) = lower('Brilho Celeste');

UPDATE public.ebd_classes current_class
SET next_class_id = next_class.id
FROM public.ebd_classes next_class
WHERE lower(current_class.name) = lower('Brilho Celeste')
  AND lower(next_class.name) = lower('Rosa de Saron');

UPDATE public.ebd_classes current_class
SET next_class_id = next_class.id
FROM public.ebd_classes next_class
WHERE lower(current_class.name) = lower('Rosa de Saron')
  AND lower(next_class.name) = lower('Joias de Cristo');

UPDATE public.ebd_classes current_class
SET next_class_id = next_class.id
FROM public.ebd_classes next_class
WHERE lower(current_class.name) = lower('Joias de Cristo')
  AND lower(next_class.name) = lower('Geração do Senhor');

UPDATE public.ebd_classes current_class
SET next_class_id = next_class.id
FROM public.ebd_classes next_class
WHERE lower(current_class.name) = lower('Geração do Senhor')
  AND lower(next_class.name) = lower('Vencedores por Cristo');

UPDATE public.ebd_classes current_class
SET next_class_id = next_class.id
FROM public.ebd_classes next_class
WHERE lower(current_class.name) = lower('Vencedores por Cristo')
  AND lower(next_class.name) = lower('Heróis da Fé');
