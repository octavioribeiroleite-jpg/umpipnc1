ALTER TABLE public.shirt_orders
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false;