-- ===== OTIMIZAÇÕES DE BANCO PARA PERFORMANCE =====

-- Criar índices compostos para queries frequentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_created 
ON orders (user_id, created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created 
ON orders (status, created_at DESC) 
WHERE status IN ('pending', 'confirmed', 'preparing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_subcategory_available 
ON products (subcategory_id, is_available, order_position);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product 
ON order_items (order_id, product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_active_position 
ON categories (is_active, order_position) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subcategories_category_active 
ON subcategories (category_id, is_active, order_position) 
WHERE is_active = true;

-- View materializada para estatísticas do admin (otimização crítica)
CREATE MATERIALIZED VIEW admin_stats_view AS
SELECT 
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
  (SELECT COUNT(*) FROM orders WHERE status IN ('delivered')) as completed_orders,
  (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE) as today_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered') as total_revenue,
  (SELECT COUNT(*) FROM products WHERE is_available = true) as total_products,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE status = 'delivered') as avg_order_value;

-- Índice para a view materializada
CREATE UNIQUE INDEX ON admin_stats_view ((1));

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

-- View para produtos mais vendidos
CREATE OR REPLACE VIEW top_products_view AS
SELECT 
  p.id,
  p.name,
  p.price,
  COUNT(oi.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_price) as total_revenue
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'delivered'
GROUP BY p.id, p.name, p.price
ORDER BY total_quantity DESC;

-- Função para refresh automático das stats (será chamada por trigger)
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_stats_view;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar stats quando pedidos mudarem
CREATE OR REPLACE FUNCTION trigger_refresh_admin_stats()
RETURNS trigger AS $$
BEGIN
  -- Usar pg_notify para refresh assíncrono
  PERFORM pg_notify('refresh_admin_stats', '');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para refresh das stats
DROP TRIGGER IF EXISTS trigger_orders_stats ON orders;
CREATE TRIGGER trigger_orders_stats
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_admin_stats();

-- Particionamento da tabela orders por mês (preparação para futuro)
-- CREATE TABLE orders_y2025m01 PARTITION OF orders
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Configurar autovacuum mais agressivo para tabelas críticas
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE order_items SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- Configurar realtime para tabelas críticas
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE beverages;