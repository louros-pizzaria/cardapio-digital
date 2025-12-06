-- CORREÇÃO: Reverter lógica que força payment_status='paid' para presenciais
-- Presenciais devem manter 'pending' até confirmação manual do atendente

-- 1. Remover trigger incorreto
DROP TRIGGER IF EXISTS auto_confirm_orders ON public.orders;

-- 2. Recriar função com lógica CORRETA
CREATE OR REPLACE FUNCTION public.auto_confirm_paid_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- APENAS confirmar pedidos quando payment_status JÁ É 'paid' (pagamentos online confirmados)
  -- NÃO forçar payment_status para presenciais
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Se pagamento foi confirmado (online) e status ainda está pending, confirmar
    IF NEW.payment_status = 'paid' AND NEW.status = 'pending' THEN
      NEW.status := 'confirmed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.auto_confirm_paid_orders() IS 
'Confirma pedidos automaticamente quando payment_status muda para paid. 
NÃO força payment_status para presenciais - eles devem ser confirmados manualmente.';

-- 3. Recriar trigger com lógica correta
CREATE TRIGGER auto_confirm_orders
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_paid_orders();

-- 4. Corrigir pedidos presenciais que foram marcados incorretamente como 'paid'
UPDATE public.orders
SET payment_status = 'pending'
WHERE payment_method IN ('cash', 'credit_card_delivery', 'debit_card_delivery')
  AND payment_status = 'paid'
  AND created_at > now() - INTERVAL '7 days';

-- 5. Índice para otimizar queries do painel do atendente
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_method 
ON public.orders(payment_status, payment_method, status);