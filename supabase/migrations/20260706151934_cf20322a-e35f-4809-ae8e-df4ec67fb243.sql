ALTER TABLE public.shirt_orders
  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.shirt_campaign_lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shirt_orders_lot_id
  ON public.shirt_orders(lot_id);

-- Encomendas antigas ficam vinculadas ao primeiro lote da campanha.
UPDATE public.shirt_orders o
SET lot_id = (
  SELECT l.id
  FROM public.shirt_campaign_lots l
  WHERE l.campaign_id = o.campaign_id
  ORDER BY l.purchase_date ASC, l.created_at ASC
  LIMIT 1
)
WHERE o.lot_id IS NULL
  AND o.campaign_id IS NOT NULL;

-- Garante que o lote selecionado pertença à mesma campanha da encomenda.
CREATE OR REPLACE FUNCTION public.validate_shirt_order_lot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.lot_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.shirt_campaign_lots l
      WHERE l.id = NEW.lot_id
        AND l.campaign_id = NEW.campaign_id
        AND l.society_id = NEW.society_id
    ) THEN
      RAISE EXCEPTION 'O lote selecionado não pertence à campanha informada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_shirt_order_lot ON public.shirt_orders;
CREATE TRIGGER trg_validate_shirt_order_lot
BEFORE INSERT OR UPDATE OF lot_id, campaign_id, society_id
ON public.shirt_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_shirt_order_lot();