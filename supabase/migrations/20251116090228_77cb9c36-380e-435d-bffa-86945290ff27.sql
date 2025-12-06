-- Atualizar trigger para confirmar automaticamente pedidos com pagamento presencial
-- Inclui: cash, credit_card_delivery, debit_card_delivery

CREATE OR REPLACE FUNCTION auto_confirm_paid_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Confirmar automaticamente se o pagamento for presencial e estiver pago
  IF NEW.payment_status = 'paid' AND 
     NEW.payment_method IN ('cash', 'credit_card_delivery', 'debit_card_delivery') AND
     NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar a trigger (se já existir, será substituída)
DROP TRIGGER IF EXISTS auto_confirm_paid_orders_trigger ON orders;

CREATE TRIGGER auto_confirm_paid_orders_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_paid_orders();