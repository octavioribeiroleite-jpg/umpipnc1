-- Corrige a exposição da função de novo lote no PostgREST/Supabase.
-- A função principal continua atômica e o wrapper JSONB evita conflitos de assinatura no schema cache.

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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

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

CREATE OR REPLACE FUNCTION public.add_shirt_campaign_lot_payload(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.add_shirt_campaign_lot(
    (p_payload->>'campaign_id')::UUID,
    COALESCE((p_payload->>'quantity')::INTEGER, 0),
    COALESCE((p_payload->>'unit_cost')::NUMERIC, 0),
    NULLIF(p_payload->>'supplier', ''),
    COALESCE((p_payload->>'purchase_date')::DATE, CURRENT_DATE),
    NULLIF(p_payload->>'notes', '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_shirt_campaign_lot_payload(JSONB) TO authenticated;

-- Solicita atualização imediata do cache de funções do PostgREST.
NOTIFY pgrst, 'reload schema';
