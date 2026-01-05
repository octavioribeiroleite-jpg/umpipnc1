-- Drop existing foreign key constraints and recreate with ON DELETE SET NULL
-- This allows transactions to be deleted while preserving related records

-- charges table
ALTER TABLE public.charges DROP CONSTRAINT IF EXISTS charges_transaction_id_fkey;
ALTER TABLE public.charges ADD CONSTRAINT charges_transaction_id_fkey 
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- files table
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_transaction_id_fkey;
ALTER TABLE public.files ADD CONSTRAINT files_transaction_id_fkey 
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- shirt_purchases table
ALTER TABLE public.shirt_purchases DROP CONSTRAINT IF EXISTS shirt_purchases_transaction_id_fkey;
ALTER TABLE public.shirt_purchases ADD CONSTRAINT shirt_purchases_transaction_id_fkey 
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- shirt_sales table
ALTER TABLE public.shirt_sales DROP CONSTRAINT IF EXISTS shirt_sales_transaction_id_fkey;
ALTER TABLE public.shirt_sales ADD CONSTRAINT shirt_sales_transaction_id_fkey 
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;