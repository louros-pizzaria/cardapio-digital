-- ===== CORREÇÕES CRÍTICAS DE SEGURANÇA =====

-- 1. Fixar view orders_with_details com RLS adequada
DROP VIEW IF EXISTS public.orders_with_details;

CREATE VIEW public.orders_with_details WITH (security_invoker=true) AS
SELECT 
  o.id,
  o.user_id,
  o.address_id,
  o.status,
  o.total_amount,
  o.delivery_fee,
  o.payment_method,
  o.estimated_delivery_time,
  o.created_at,
  o.updated_at,
  o.payment_status,
  o.notes,
  o.customer_name,
  o.customer_phone,
  COUNT(oi.id) as items_count,
  SUM(oi.quantity) as total_items,
  p.email as customer_email,
  a.street,
  a.number,
  a.neighborhood,
  a.city,
  a.complement,
  a.reference_point
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.profiles p ON o.user_id = p.id
LEFT JOIN public.addresses a ON o.address_id = a.id
GROUP BY o.id, o.user_id, o.address_id, o.status, o.total_amount, o.delivery_fee, 
         o.payment_method, o.estimated_delivery_time, o.created_at, o.updated_at,
         o.payment_status, o.notes, o.customer_name, o.customer_phone, p.email,
         a.street, a.number, a.neighborhood, a.city, a.complement, a.reference_point;

-- RLS para orders_with_details
ALTER VIEW public.orders_with_details ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para orders_with_details
CREATE POLICY "Users can view their own order details"
ON public.orders_with_details FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all order details"
ON public.orders_with_details FOR SELECT
USING (has_role('admin'));

CREATE POLICY "Attendants can view order details"
ON public.orders_with_details FOR SELECT
USING (has_any_role(ARRAY['admin', 'attendant']));

-- 2. Corrigir funções sem search_path
CREATE OR REPLACE FUNCTION public.validate_product_availability(product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM products 
    WHERE id = product_id 
    AND is_available = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_item_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Limitar quantidade máxima por item (20 unidades)
  IF NEW.quantity > 20 THEN
    RAISE EXCEPTION 'Quantidade máxima por item é 20 unidades';
  END IF;
  
  -- Verificar se produto está disponível
  IF NOT public.validate_product_availability(NEW.product_id) THEN
    RAISE EXCEPTION 'Produto não está disponível';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Validar valor mínimo e máximo
  IF NEW.total_amount < 15.00 THEN
    RAISE EXCEPTION 'Valor mínimo do pedido é R$ 15,00';
  END IF;
  
  IF NEW.total_amount > 500.00 THEN
    RAISE EXCEPTION 'Valor máximo do pedido é R$ 500,00';
  END IF;
  
  -- Verificar limite de pedidos por hora (5 pedidos)
  IF EXISTS (
    SELECT 1 FROM orders 
    WHERE user_id = NEW.user_id 
    AND created_at > NOW() - INTERVAL '1 hour'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    GROUP BY user_id
    HAVING COUNT(*) >= 5
  ) THEN
    RAISE EXCEPTION 'Limite de 5 pedidos por hora excedido';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Notificar sobre eventos críticos de segurança
  IF NEW.action IN ('multiple_failed_logins', 'suspicious_order_pattern', 'rate_limit_exceeded') THEN
    PERFORM pg_notify('security_alert', json_build_object(
      'event', NEW.action,
      'user_id', NEW.user_id,
      'details', NEW.details,
      'timestamp', NEW.created_at
    )::text);
  END IF;
  
  RETURN NEW;
END;
$function$;