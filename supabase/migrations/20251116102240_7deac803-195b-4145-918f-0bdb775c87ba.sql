-- ===== PASSO 1: CONSOLIDAÇÃO E CORREÇÃO DE TRIGGERS =====

-- 1.1. Remover triggers duplicados (se existirem)
DROP TRIGGER IF EXISTS auto_confirm_paid_orders_trigger ON public.orders;
DROP TRIGGER IF EXISTS trigger_auto_confirm_orders ON public.orders;

-- 1.2. Recriar função fortalecida com garantia de payment_status='paid' em presenciais
CREATE OR REPLACE FUNCTION public.auto_confirm_paid_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- PROTEÇÃO: Forçar payment_status='paid' para métodos presenciais
  IF NEW.payment_method IN ('cash', 'credit_card_delivery', 'debit_card_delivery') THEN
    -- Se payment_status está vazio ou pending, forçar 'paid'
    IF NEW.payment_status IS NULL OR NEW.payment_status = 'pending' THEN
      NEW.payment_status := 'paid';
    END IF;
  END IF;

  -- CONFIRMAÇÃO AUTOMÁTICA: Se pagamento está pago e status está pendente, confirmar
  IF NEW.payment_status = 'paid' AND NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.3. Criar trigger consolidado BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS auto_confirm_orders ON public.orders;
CREATE TRIGGER auto_confirm_orders
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_paid_orders();

-- 1.4. CORREÇÃO RETROATIVA: Atualizar pedidos presenciais existentes que estão pendentes
UPDATE public.orders
SET 
  payment_status = 'paid',
  status = 'confirmed',
  updated_at = now()
WHERE 
  payment_method IN ('cash', 'credit_card_delivery', 'debit_card_delivery')
  AND status = 'pending'
  AND payment_status = 'pending';

-- 1.5. LOG: Criar índice para otimizar queries do painel do atendente
CREATE INDEX IF NOT EXISTS idx_orders_status_payment_method 
  ON public.orders(status, payment_method, created_at DESC)
  WHERE status IN ('pending', 'confirmed');