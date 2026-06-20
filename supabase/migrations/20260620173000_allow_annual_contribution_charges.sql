-- Allow the unified annual member contribution charge type.
-- The app uses this single charge to show contribution + per capita together.
ALTER TABLE public.charges
  DROP CONSTRAINT IF EXISTS charges_type_check;

ALTER TABLE public.charges
  ADD CONSTRAINT charges_type_check
  CHECK (type IN ('mensalidade', 'percapita', 'annual_contribution'));
