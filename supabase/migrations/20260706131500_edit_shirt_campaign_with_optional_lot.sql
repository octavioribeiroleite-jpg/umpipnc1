CREATE OR REPLACE FUNCTION public.update_shirt_campaign_with_optional_lot(
  p_campaign_id UUID,
  p_name TEXT,
  p_default_sale_price NUMERIC,
  p_supplier TEXT,
  p_additional_quantity INTEGER DEFAULT 0,
  p_additional_unit_cost NUMERIC DEFAULT 0,
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
  v_lot_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
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

  IF TRIM(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'O nome da campanha é obrigatório';
  END IF;

  IF p_default_sale_price IS NULL OR p_default_sale_price < 0 THEN
    RAISE EXCEPTION 'O preço padrão não pode ser negativo';
  END IF;

  IF COALESCE(p_additional_quantity, 0) < 0 THEN
    RAISE EXCEPTION 'A quantidade adicional não pode ser negativa';
  END IF;

  IF COALESCE(p_additional_quantity, 0) > 0 AND COALESCE(p_additional_unit_cost, 0) < 0 THEN
    RAISE EXCEPTION 'O custo unitário adicional não pode ser negativo';
  END IF;

  UPDATE public.shirt_campaigns
  SET name = TRIM(p_name),
      default_sale_price = p_default_sale_price,
      supplier = NULLIF(TRIM(COALESCE(p_supplier, '')), ''),
      updated_at = now()
  WHERE id = p_campaign_id;

  IF COALESCE(p_additional_quantity, 0) > 0 THEN
    v_lot_result := public.add_shirt_campaign_lot(
      p_campaign_id,
      p_additional_quantity,
      COALESCE(p_additional_unit_cost, 0),
      p_supplier,
      COALESCE(p_purchase_date, CURRENT_DATE),
      p_notes
    );
  END IF;

  RETURN jsonb_build_object(
    'campaign_id', p_campaign_id,
    'updated', true,
    'lot_added', COALESCE(p_additional_quantity, 0) > 0,
    'lot', v_lot_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_shirt_campaign_with_optional_lot(
  UUID, TEXT, NUMERIC, TEXT, INTEGER, NUMERIC, DATE, TEXT
) TO authenticated;
