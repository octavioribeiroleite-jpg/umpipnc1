ALTER TABLE public.aniversariantes
  ADD COLUMN IF NOT EXISTS ano_nascimento integer;

ALTER TABLE public.aniversariantes
  ADD CONSTRAINT aniversariantes_ano_nascimento_check
  CHECK (
    ano_nascimento IS NULL
    OR (ano_nascimento >= 1900 AND ano_nascimento <= EXTRACT(YEAR FROM now())::integer)
  );
