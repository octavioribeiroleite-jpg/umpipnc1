-- Histórico de lotes das campanhas de camisas
CREATE TABLE IF NOT EXISTS public.shirt_campaign_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.shirt_campaigns(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  supplier TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  society_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shirt_campaign_lots_campaign
  ON public.shirt_campaign_lots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_shirt_campaign_lots_society
  ON public.shirt_campaign_lots(society_id);
CREATE INDEX IF NOT EXISTS idx_shirt_campaign_lots_purchase_date
  ON public.shirt_campaign_lots(purchase_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shirt_campaign_lots TO authenticated;
GRANT ALL ON public.shirt_campaign_lots TO service_role;

ALTER TABLE public.shirt_campaign_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Society isolated SELECT shirt_campaign_lots" ON public.shirt_campaign_lots;
CREATE POLICY "Society isolated SELECT shirt_campaign_lots"
ON public.shirt_campaign_lots
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

DROP POLICY IF EXISTS "Society isolated management shirt_campaign_lots" ON public.shirt_campaign_lots;
CREATE POLICY "Society isolated management shirt_campaign_lots"
ON public.shirt_campaign_lots
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
);

-- Registra os lotes iniciais das campanhas já existentes.
INSERT INTO public.shirt_campaign_lots (
  campaign_id, quantity, unit_cost, total_cost, supplier, purchase_date,
  transaction_id, society_id, created_by, notes
)
SELECT
  c.id, c.purchased_quantity, c.unit_cost, c.total_purchase_cost, c.supplier,
  c.purchase_date, c.transaction_id, c.society_id, c.created_by, 'Lote inicial'
FROM public.shirt_campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM public.shirt_campaign_lots l WHERE l.campaign_id = c.id
);

-- Atualiza a criação de campanha para também registrar o lote inicial.
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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
  IF p_society_id IS NULL THEN RAISE EXCEPTION 'Sociedade não informada'; END IF;
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
  ) VALUES (
    'Compra de camisas - ' || p_name || ' - lote 1 - ' || p_purchased_quantity || ' unidades',
    v_total_cost, 'saida', COALESCE(p_purchase_date, CURRENT_DATE),
    v_user_id, 'automatic', 'shirt_campaign_purchase', p_society_id
  ) RETURNING id INTO v_transaction_id;

  INSERT INTO public.shirt_campaigns (
    name, purchased_quantity, unit_cost, total_purchase_cost, default_sale_price,
    supplier, purchase_date, transaction_id, society_id, created_by
  ) VALUES (
    TRIM(p_name), p_purchased_quantity, p_unit_cost, v_total_cost, p_default_sale_price,
    NULLIF(TRIM(COALESCE(p_supplier, '')), ''), COALESCE(p_purchase_date, CURRENT_DATE),
    v_transaction_id, p_society_id, v_user_id
  ) RETURNING id INTO v_campaign_id;

  INSERT INTO public.shirt_campaign_lots (
    campaign_id, quantity, unit_cost, total_cost, supplier, purchase_date,
    transaction_id, society_id, created_by, notes
  ) VALUES (
    v_campaign_id, p_purchased_quantity, p_unit_cost, v_total_cost,
    NULLIF(TRIM(COALESCE(p_supplier, '')), ''), COALESCE(p_purchase_date, CURRENT_DATE),
    v_transaction_id, p_society_id, v_user_id, 'Lote inicial'
  );

  RETURN v_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shirt_campaign(TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, DATE, UUID) TO authenticated;

-- Adiciona um novo lote à campanha, cria a saída financeira e recalcula os totais.
CREATE OR REPLACE FUNCTION public.add_shirt_campaign_lot(
  p_campaign_id UUID,
  p_quantity INTEGER,
  p_unit_cost NUMERIC,
  p_supplier TEXT DEFAULT NULL,
  p_purchase_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_campaign public.shirt_campaigns%ROWTYPE;
  v_transaction_id UUID;
  v_lot_id UUID;
  v_lot_number INTEGER;
  v_total_cost NUMERIC(12,2);
  v_new_quantity INTEGER;
  v_new_total_cost NUMERIC(12,2);
  v_new_unit_cost NUMERIC(12,2);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade do lote deve ser maior que zero';
  END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'O custo unitário não pode ser negativo';
  END IF;

  SELECT * INTO v_campaign
  FROM public.shirt_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;

  IF NOT (
    has_role(v_user_id, 'admin'::app_role)
    OR (has_role(v_user_id, 'diretoria'::app_role) AND v_campaign.society_id = get_user_society_id(v_user_id))
  ) THEN
    RAISE EXCEPTION 'Usuário sem permissão para esta campanha';
  END IF;

  SELECT COUNT(*) + 1 INTO v_lot_number
  FROM public.shirt_campaign_lots
  WHERE campaign_id = p_campaign_id;

  v_total_cost := ROUND(p_quantity * p_unit_cost, 2);
  v_new_quantity := v_campaign.purchased_quantity + p_quantity;
  v_new_total_cost := ROUND(v_campaign.total_purchase_cost + v_total_cost, 2);
  v_new_unit_cost := CASE
    WHEN v_new_quantity > 0 THEN ROUND(v_new_total_cost / v_new_quantity, 2)
    ELSE 0
  END;

  INSERT INTO public.transactions (
    description, amount, type, date, created_by, origin, reference_type, society_id
  ) VALUES (
    'Compra de camisas - ' || v_campaign.name || ' - lote ' || v_lot_number || ' - ' || p_quantity || ' unidades',
    v_total_cost, 'saida', COALESCE(p_purchase_date, CURRENT_DATE),
    v_user_id, 'automatic', 'shirt_campaign_purchase', v_campaign.society_id
  ) RETURNING id INTO v_transaction_id;

  INSERT INTO public.shirt_campaign_lots (
    campaign_id, quantity, unit_cost, total_cost, supplier, purchase_date,
    notes, transaction_id, society_id, created_by
  ) VALUES (
    p_campaign_id, p_quantity, p_unit_cost, v_total_cost,
    NULLIF(TRIM(COALESCE(p_supplier, '')), ''), COALESCE(p_purchase_date, CURRENT_DATE),
    NULLIF(TRIM(COALESCE(p_notes, '')), ''), v_transaction_id,
    v_campaign.society_id, v_user_id
  ) RETURNING id INTO v_lot_id;

  UPDATE public.shirt_campaigns
  SET purchased_quantity = v_new_quantity,
      total_purchase_cost = v_new_total_cost,
      unit_cost = v_new_unit_cost,
      supplier = COALESCE(NULLIF(TRIM(COALESCE(p_supplier, '')), ''), supplier),
      updated_at = now()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'campaign_id', p_campaign_id,
    'lot_id', v_lot_id,
    'lot_number', v_lot_number,
    'quantity_added', p_quantity,
    'purchased_quantity', v_new_quantity,
    'total_purchase_cost', v_new_total_cost,
    'unit_cost', v_new_unit_cost,
    'transaction_id', v_transaction_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_shirt_campaign_lot(UUID, INTEGER, NUMERIC, TEXT, DATE, TEXT) TO authenticated;
