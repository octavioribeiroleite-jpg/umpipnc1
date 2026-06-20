-- Ampliar tipos de referência permitidos nas transações
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_reference_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reference_type_check
  CHECK (reference_type = ANY (ARRAY[
    'charge'::text,
    'shirt_purchase'::text,
    'shirt_sale'::text,
    'shirt_campaign_purchase'::text,
    'shirt_order_payment'::text
  ]));

-- Tabela de campanhas/lotes de camisas
CREATE TABLE IF NOT EXISTS public.shirt_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  purchased_quantity INTEGER NOT NULL CHECK (purchased_quantity > 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_purchase_cost >= 0),
  default_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (default_sale_price >= 0),
  supplier TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  society_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shirt_campaigns_society ON public.shirt_campaigns(society_id);
CREATE INDEX IF NOT EXISTS idx_shirt_campaigns_purchase_date ON public.shirt_campaigns(purchase_date);

-- Novas colunas nas encomendas
ALTER TABLE public.shirt_orders
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.shirt_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.shirt_orders
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Novas colunas nos pagamentos
ALTER TABLE public.shirt_order_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.shirt_order_payments ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_shirt_orders_campaign ON public.shirt_orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_shirt_order_payments_order ON public.shirt_order_payments(order_id);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shirt_campaigns TO authenticated;
GRANT ALL ON public.shirt_campaigns TO service_role;

-- RLS
ALTER TABLE public.shirt_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Society isolated SELECT shirt_campaigns" ON public.shirt_campaigns;
CREATE POLICY "Society isolated SELECT shirt_campaigns"
ON public.shirt_campaigns
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

DROP POLICY IF EXISTS "Society isolated management shirt_campaigns" ON public.shirt_campaigns;
CREATE POLICY "Society isolated management shirt_campaigns"
ON public.shirt_campaigns
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
);

DROP TRIGGER IF EXISTS update_shirt_campaigns_updated_at ON public.shirt_campaigns;
CREATE TRIGGER update_shirt_campaigns_updated_at
BEFORE UPDATE ON public.shirt_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função atômica: criar campanha + saída financeira
CREATE OR REPLACE FUNCTION public.create_shirt_campaign(
  p_name TEXT,
  p_purchased_quantity INTEGER,
  p_unit_cost NUMERIC,
  p_default_sale_price NUMERIC,
  p_supplier TEXT,
  p_purchase_date DATE,
  p_society_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_campaign_id UUID;
  v_transaction_id UUID;
  v_total_cost NUMERIC(12,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF p_society_id IS NULL THEN
    RAISE EXCEPTION 'Sociedade não informada';
  END IF;
  IF p_purchased_quantity IS NULL OR p_purchased_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade comprada deve ser maior que zero';
  END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'O custo unitário não pode ser negativo';
  END IF;
  IF p_default_sale_price IS NULL OR p_default_sale_price < 0 THEN
    RAISE EXCEPTION 'O preço de venda não pode ser negativo';
  END IF;
  IF NOT (
    has_role(v_user_id, 'admin'::app_role)
    OR (has_role(v_user_id, 'diretoria'::app_role) AND p_society_id = get_user_society_id(v_user_id))
  ) THEN
    RAISE EXCEPTION 'Usuário sem permissão para esta sociedade';
  END IF;

  v_total_cost := ROUND(p_purchased_quantity * p_unit_cost, 2);

  INSERT INTO public.transactions (
    description, amount, type, date, created_by, origin, reference_type, society_id
  )
  VALUES (
    'Compra de camisas - ' || p_name || ' - ' || p_purchased_quantity || ' unidades',
    v_total_cost, 'saida', COALESCE(p_purchase_date, CURRENT_DATE),
    v_user_id, 'automatic', 'shirt_campaign_purchase', p_society_id
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.shirt_campaigns (
    name, purchased_quantity, unit_cost, total_purchase_cost, default_sale_price,
    supplier, purchase_date, transaction_id, society_id, created_by
  )
  VALUES (
    TRIM(p_name), p_purchased_quantity, p_unit_cost, v_total_cost, p_default_sale_price,
    NULLIF(TRIM(COALESCE(p_supplier, '')), ''), COALESCE(p_purchase_date, CURRENT_DATE),
    v_transaction_id, p_society_id, v_user_id
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shirt_campaign(TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, DATE, UUID) TO authenticated;

-- Função atômica: registrar pagamento de encomenda
CREATE OR REPLACE FUNCTION public.register_shirt_order_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'pix',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order public.shirt_orders%ROWTYPE;
  v_remaining NUMERIC(12,2);
  v_new_amount_paid NUMERIC(12,2);
  v_transaction_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'O valor do pagamento deve ser maior que zero';
  END IF;

  SELECT * INTO v_order FROM public.shirt_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encomenda não encontrada';
  END IF;

  IF NOT (
    has_role(v_user_id, 'admin'::app_role)
    OR (has_role(v_user_id, 'diretoria'::app_role) AND v_order.society_id = get_user_society_id(v_user_id))
  ) THEN
    RAISE EXCEPTION 'Usuário sem permissão para esta encomenda';
  END IF;

  IF COALESCE(v_order.is_gift, false) THEN
    RAISE EXCEPTION 'Não é possível registrar pagamento para um brinde';
  END IF;

  v_remaining := GREATEST(ROUND(COALESCE(v_order.total_price, 0) - COALESCE(v_order.amount_paid, 0), 2), 0);
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Esta encomenda já está totalmente paga';
  END IF;
  IF p_amount > v_remaining + 0.009 THEN
    RAISE EXCEPTION 'O pagamento ultrapassa o valor pendente de R$ %', TO_CHAR(v_remaining, 'FM999999990D00');
  END IF;

  INSERT INTO public.transactions (
    description, amount, type, date, created_by, origin, reference_type, society_id
  )
  VALUES (
    'Camisa - pagamento de ' || v_order.buyer_name || ' (' || v_order.size || ')',
    ROUND(p_amount, 2), 'entrada', COALESCE(p_payment_date, CURRENT_DATE),
    v_user_id, 'automatic', 'shirt_order_payment', v_order.society_id
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.shirt_order_payments (
    order_id, amount, date, transaction_id, society_id, created_by, payment_method, notes
  )
  VALUES (
    v_order.id, ROUND(p_amount, 2), COALESCE(p_payment_date, CURRENT_DATE)::TIMESTAMPTZ,
    v_transaction_id, v_order.society_id, v_user_id,
    NULLIF(TRIM(COALESCE(p_payment_method, '')), ''), NULLIF(TRIM(COALESCE(p_notes, '')), '')
  );

  v_new_amount_paid := ROUND(COALESCE(v_order.amount_paid, 0) + p_amount, 2);

  UPDATE public.shirt_orders
  SET amount_paid = v_new_amount_paid, updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'transaction_id', v_transaction_id,
    'amount_registered', ROUND(p_amount, 2),
    'amount_paid', v_new_amount_paid,
    'remaining', GREATEST(ROUND(v_order.total_price - v_new_amount_paid, 2), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_shirt_order_payment(UUID, NUMERIC, DATE, TEXT, TEXT) TO authenticated;