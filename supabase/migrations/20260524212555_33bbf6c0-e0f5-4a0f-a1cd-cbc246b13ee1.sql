ALTER TABLE public.ebd_students ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ebd_students_origin_check'
  ) THEN
    ALTER TABLE public.ebd_students
      ADD CONSTRAINT ebd_students_origin_check CHECK (origin IN ('manual','importado'));
  END IF;
END $$;