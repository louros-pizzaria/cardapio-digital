-- ===== CORREÇÃO: AUTO-CONFIRMAÇÃO DE PEDIDOS =====
-- Atualizar trigger para confirmar automaticamente:
-- 1. Pedidos em dinheiro (payment_method = 'cash') no INSERT
-- 2. Pedidos online quando payment_status = 'paid' no UPDATE

-- Drop trigger existente
DROP TRIGGER IF EXISTS auto_confirm_orders ON public.orders;

-- Recriar função com lógica corrigida
CREATE OR REPLACE FUNCTION public.auto_confirm_paid_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- CASO 1: INSERT - Confirmar pedidos em dinheiro imediatamente
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_method = 'cash' AND NEW.status = 'pending' THEN
      NEW.status := 'confirmed';
      RAISE NOTICE 'Auto-confirmado: Pedido % (dinheiro)', NEW.id;
    END IF;
  
  -- CASO 2: UPDATE - Confirmar pedidos online quando pagamento confirmado
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pending' 
       AND OLD.payment_status != 'paid' 
       AND NEW.payment_status = 'paid' THEN
      NEW.status := 'confirmed';
      RAISE NOTICE 'Auto-confirmado: Pedido % (pagamento online)', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar trigger para INSERT e UPDATE
CREATE TRIGGER auto_confirm_orders
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_paid_orders();