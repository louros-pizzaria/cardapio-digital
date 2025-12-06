-- ===== CORREÇÕES DE SEGURANÇA - PARTE 2 =====

-- 1. Remover RLS da view (views não suportam RLS diretamente)
DROP VIEW IF EXISTS public.orders_with_details;

-- Recriar view com security_invoker (usuário que executa precisa ter acesso aos dados)
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

-- 2. Criar função segura para acessar detalhes de pedidos
CREATE OR REPLACE FUNCTION public.get_order_details_for_staff()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  status order_status,
  total_amount numeric,
  delivery_fee numeric,
  payment_method payment_method,
  payment_status text,
  created_at timestamptz,
  updated_at timestamptz,
  items_count bigint,
  total_items bigint,
  street text,
  number text,
  neighborhood text,
  city text,
  notes text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    o.id,
    o.user_id,
    o.customer_name,
    o.customer_phone,
    p.email as customer_email,
    o.status,
    o.total_amount,
    o.delivery_fee,
    o.payment_method,
    o.payment_status,
    o.created_at,
    o.updated_at,
    COUNT(oi.id) as items_count,
    SUM(oi.quantity) as total_items,
    a.street,
    a.number,
    a.neighborhood,
    a.city,
    o.notes
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN profiles p ON o.user_id = p.id
  LEFT JOIN addresses a ON o.address_id = a.id
  WHERE has_any_role(ARRAY['admin', 'attendant'])
  GROUP BY o.id, o.user_id, o.customer_name, o.customer_phone, p.email,
           o.status, o.total_amount, o.delivery_fee, o.payment_method,
           o.payment_status, o.created_at, o.updated_at, a.street,
           a.number, a.neighborhood, a.city, o.notes
  ORDER BY o.created_at DESC;
$$;