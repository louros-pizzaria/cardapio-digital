-- Adicionar coluna order_number
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- Popular com números sequenciais baseados em created_at
WITH numbered_orders AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as seq_number
  FROM orders
)
UPDATE orders
SET order_number = numbered_orders.seq_number
FROM numbered_orders
WHERE orders.id = numbered_orders.id AND orders.order_number IS NULL;

-- Criar sequence para novos pedidos (começa em 1)
CREATE SEQUENCE IF NOT EXISTS orders_number_seq;

-- Ajustar sequence para começar após o último número existente
SELECT setval('orders_number_seq', COALESCE((SELECT MAX(order_number) FROM orders), 0) + 1, false);

-- Definir default para novos pedidos
ALTER TABLE orders 
  ALTER COLUMN order_number 
  SET DEFAULT nextval('orders_number_seq');

-- Tornar NOT NULL após popular (apenas se houver dados)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE order_number IS NULL) THEN
    RAISE EXCEPTION 'Ainda existem pedidos sem order_number';
  END IF;
  ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
END
$$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);