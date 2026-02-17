
-- Add society_id to meetings
ALTER TABLE public.meetings ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_meetings_society_id ON public.meetings(society_id);

-- Add society_id to tasks
ALTER TABLE public.tasks ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_tasks_society_id ON public.tasks(society_id);

-- Add society_id to members
ALTER TABLE public.members ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_members_society_id ON public.members(society_id);

-- Add society_id to transactions
ALTER TABLE public.transactions ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_transactions_society_id ON public.transactions(society_id);

-- Add society_id to charges
ALTER TABLE public.charges ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_charges_society_id ON public.charges(society_id);

-- Add society_id to files
ALTER TABLE public.files ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_files_society_id ON public.files(society_id);

-- Add society_id to financial_settings
ALTER TABLE public.financial_settings ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_financial_settings_society_id ON public.financial_settings(society_id);

-- Add society_id to financial_categories
ALTER TABLE public.financial_categories ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_financial_categories_society_id ON public.financial_categories(society_id);

-- Add society_id to shirt_inventory
ALTER TABLE public.shirt_inventory ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_shirt_inventory_society_id ON public.shirt_inventory(society_id);

-- Add society_id to shirt_purchases
ALTER TABLE public.shirt_purchases ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_shirt_purchases_society_id ON public.shirt_purchases(society_id);

-- Add society_id to shirt_sales
ALTER TABLE public.shirt_sales ADD COLUMN society_id uuid REFERENCES public.societies(id);
CREATE INDEX idx_shirt_sales_society_id ON public.shirt_sales(society_id);
