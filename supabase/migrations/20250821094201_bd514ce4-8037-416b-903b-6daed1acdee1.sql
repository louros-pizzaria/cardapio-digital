-- ===== FINALIZAR CORREÇÕES DE SEGURANÇA =====

-- Remover security definer das views (manter apenas na function)
DROP VIEW IF EXISTS orders_with_details;

-- Recriar view sem security definer, usando RLS padrão
CREATE OR REPLACE VIEW orders_with_details AS
SELECT 
  o.*,
  p.full_name as customer_name,
  p.phone as customer_phone,
  p.email as customer_email,
  a.street,
  a.number,
  a.neighborhood,
  a.city,
  a.complement,
  a.reference_point,
  COUNT(oi.id) as items_count,
  SUM(oi.quantity) as total_items
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN addresses a ON o.address_id = a.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, p.full_name, p.phone, p.email, a.street, a.number, a.neighborhood, a.city, a.complement, a.reference_point;

-- Remover view admin_stats_secure que pode estar causando problema
DROP VIEW IF EXISTS public.admin_stats_secure;

-- Criar função para admin stats que respeita RLS
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_orders bigint,
  pending_orders bigint,
  completed_orders bigint,
  today_orders bigint,
  total_revenue numeric,
  total_products bigint,
  total_users bigint,
  avg_order_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Retornar stats da materialized view
  RETURN QUERY
  SELECT * FROM admin_stats_view;
END;
$$;

-- Grant para função
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;