-- ===== OTIMIZAÇÕES DE BANCO PARA PERFORMANCE =====

-- Criar índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders (user_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_subcategory_available 
ON products (subcategory_id, is_available, order_position);

CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
ON order_items (order_id, product_id);

CREATE INDEX IF NOT EXISTS idx_categories_active_position 
ON categories (is_active, order_position);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_active 
ON subcategories (category_id, is_active, order_position);

-- View materializada para estatísticas do admin (otimização crítica)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats_view AS
SELECT 
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
  (SELECT COUNT(*) FROM orders WHERE status IN ('delivered')) as completed_orders,
  (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE) as today_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered') as total_revenue,
  (SELECT COUNT(*) FROM products WHERE is_available = true) as total_products,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE status = 'delivered') as avg_order_value;

-- View para pedidos com dados relacionados (otimização de joins)
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

-- Função para refresh automático das stats
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_stats_view;
END;
$$ LANGUAGE plpgsql;

-- Configurar realtime para tabelas críticas
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE products;