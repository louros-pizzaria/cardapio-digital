-- ===== CORREÇÕES DE SEGURANÇA =====

-- 1. Corrigir function search_path
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_stats_view;
END;
$$;

-- 2. Remover materialized view da API (tornar privada)
REVOKE ALL ON admin_stats_view FROM anon, authenticated;

-- 3. Criar view segura para API que usa RLS
CREATE OR REPLACE VIEW public.admin_stats_secure AS
SELECT * FROM admin_stats_view
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
);

-- 4. Grant permissions corretos na view segura
GRANT SELECT ON public.admin_stats_secure TO authenticated;

-- 5. Criar RLS policy para a view segura
ALTER VIEW public.admin_stats_secure OWNER TO postgres;

-- 6. Corrigir view orders_with_details para ser security definer
CREATE OR REPLACE VIEW orders_with_details
WITH (security_barrier = true) AS
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
WHERE (
  -- Usuário pode ver seus próprios pedidos
  auth.uid() = o.user_id
  OR
  -- Admin/attendant pode ver todos
  EXISTS (
    SELECT 1 FROM profiles prof 
    WHERE prof.id = auth.uid() 
    AND prof.role IN ('admin', 'attendant')
  )
)
GROUP BY o.id, p.full_name, p.phone, p.email, a.street, a.number, a.neighborhood, a.city, a.complement, a.reference_point;