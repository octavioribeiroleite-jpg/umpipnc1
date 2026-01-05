
-- Tabela de configurações financeiras por competência
CREATE TABLE public.financial_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competence TEXT NOT NULL UNIQUE,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  per_capita NUMERIC NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cobranças individuais
CREATE TABLE public.charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  competence TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mensalidade', 'percapita')),
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'isento', 'cancelado')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, competence, type)
);

-- Tabela de estoque de camisas
CREATE TABLE public.shirt_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size TEXT NOT NULL UNIQUE CHECK (size IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
  quantity INTEGER NOT NULL DEFAULT 0,
  average_cost NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inicializar estoque com tamanhos padrão
INSERT INTO public.shirt_inventory (size, quantity, average_cost) VALUES
  ('PP', 0, 0),
  ('P', 0, 0),
  ('M', 0, 0),
  ('G', 0, 0),
  ('GG', 0, 0),
  ('XG', 0, 0);

-- Tabela de compras de camisas
CREATE TABLE public.shirt_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  supplier TEXT,
  total_quantity INTEGER NOT NULL,
  total_cost NUMERIC NOT NULL,
  unit_cost NUMERIC GENERATED ALWAYS AS (CASE WHEN total_quantity > 0 THEN total_cost / total_quantity ELSE 0 END) STORED,
  receipt_url TEXT,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens de compra por tamanho
CREATE TABLE public.shirt_purchase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.shirt_purchases(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
  quantity INTEGER NOT NULL DEFAULT 0
);

-- Tabela de vendas de camisas
CREATE TABLE public.shirt_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  buyer_name TEXT,
  member_id UUID REFERENCES public.members(id),
  size TEXT NOT NULL CHECK (size IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual' CHECK (origin IN ('manual', 'automatic')),
ADD COLUMN IF NOT EXISTS reference_type TEXT CHECK (reference_type IN ('charge', 'shirt_purchase', 'shirt_sale')),
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id);

-- Enable RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_settings
CREATE POLICY "Financial settings viewable by authenticated" ON public.financial_settings FOR SELECT USING (true);
CREATE POLICY "Management can manage financial settings" ON public.financial_settings FOR ALL USING (has_management_role(auth.uid()));

-- RLS Policies for charges
CREATE POLICY "Charges viewable by authenticated" ON public.charges FOR SELECT USING (true);
CREATE POLICY "Management can manage charges" ON public.charges FOR ALL USING (has_management_role(auth.uid()));

-- RLS Policies for shirt_inventory
CREATE POLICY "Shirt inventory viewable by authenticated" ON public.shirt_inventory FOR SELECT USING (true);
CREATE POLICY "Management can manage shirt inventory" ON public.shirt_inventory FOR ALL USING (has_management_role(auth.uid()));

-- RLS Policies for shirt_purchases
CREATE POLICY "Shirt purchases viewable by authenticated" ON public.shirt_purchases FOR SELECT USING (true);
CREATE POLICY "Management can manage shirt purchases" ON public.shirt_purchases FOR ALL USING (has_management_role(auth.uid()));

-- RLS Policies for shirt_purchase_items
CREATE POLICY "Shirt purchase items viewable by authenticated" ON public.shirt_purchase_items FOR SELECT USING (true);
CREATE POLICY "Management can manage shirt purchase items" ON public.shirt_purchase_items FOR ALL USING (has_management_role(auth.uid()));

-- RLS Policies for shirt_sales
CREATE POLICY "Shirt sales viewable by authenticated" ON public.shirt_sales FOR SELECT USING (true);
CREATE POLICY "Management can manage shirt sales" ON public.shirt_sales FOR ALL USING (has_management_role(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_financial_settings_updated_at BEFORE UPDATE ON public.financial_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_charges_updated_at BEFORE UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shirt_inventory_updated_at BEFORE UPDATE ON public.shirt_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar categoria "Camisas" nas categorias financeiras se não existir
INSERT INTO public.financial_categories (name, type, color) 
SELECT 'Camisas', 'saida', '#8b5cf6'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Camisas');

-- Criar bucket para comprovantes
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket de comprovantes
CREATE POLICY "Receipts are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Management can delete receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND has_management_role(auth.uid()));
