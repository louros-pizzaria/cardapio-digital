-- ===== TRIGGER PARA AUTO-CONFIRMAÇÃO DE PEDIDOS =====
-- Pedidos com pagamento confirmado devem ir automaticamente para 'confirmed'

CREATE OR REPLACE FUNCTION auto_confirm_paid_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Se pedido está pendente mas pagamento já foi confirmado, confirmar automaticamente
  IF NEW.status = 'pending' AND NEW.payment_status = 'paid' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_confirm_orders
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_paid_orders();