CREATE TABLE public.shirt_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_name TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'a_vista',
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  delivery_status TEXT NOT NULL DEFAULT 'pendente',
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  society_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shirt_orders TO authenticated;
GRANT ALL ON public.shirt_orders TO service_role;

ALTER TABLE public.shirt_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society isolated SELECT shirt_orders" ON public.shirt_orders
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_pastor_role(auth.uid()) OR (society_id = get_user_society_id(auth.uid()))
);

CREATE POLICY "Society isolated management shirt_orders" ON public.shirt_orders
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'diretoria'::app_role) AND (society_id = get_user_society_id(auth.uid())))
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'diretoria'::app_role) AND (society_id = get_user_society_id(auth.uid())))
);

CREATE TRIGGER update_shirt_orders_updated_at BEFORE UPDATE ON public.shirt_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shirt_order_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.shirt_orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_id UUID,
  society_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shirt_order_payments TO authenticated;
GRANT ALL ON public.shirt_order_payments TO service_role;

ALTER TABLE public.shirt_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society isolated SELECT shirt_order_payments" ON public.shirt_order_payments
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_pastor_role(auth.uid()) OR (society_id = get_user_society_id(auth.uid()))
);

CREATE POLICY "Society isolated management shirt_order_payments" ON public.shirt_order_payments
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'diretoria'::app_role) AND (society_id = get_user_society_id(auth.uid())))
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'diretoria'::app_role) AND (society_id = get_user_society_id(auth.uid())))
);