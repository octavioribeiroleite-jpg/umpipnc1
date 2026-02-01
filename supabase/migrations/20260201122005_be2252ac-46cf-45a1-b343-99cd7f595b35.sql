-- Add paid_amount column to charges table for partial payments
ALTER TABLE public.charges ADD COLUMN paid_amount numeric DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.charges.paid_amount IS 'Amount actually paid. When NULL or equal to amount, it means full payment. When less than amount, it is a partial payment.';