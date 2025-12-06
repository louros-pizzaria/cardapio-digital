-- FASE 2: Adicionar CPF e Email do Cliente na tabela orders
-- Isso permite que os dados sejam salvos diretamente no pedido,
-- independentemente de mudanças futuras no perfil do usuário

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Criar índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_cpf ON orders(customer_cpf);

-- Comentários para documentação
COMMENT ON COLUMN orders.customer_cpf IS 'CPF do cliente no momento da compra (snapshot)';
COMMENT ON COLUMN orders.customer_email IS 'Email do cliente no momento da compra (snapshot)';