-- Adicionar coluna para snapshot do endereço nos pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address_snapshot jsonb;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_messages_order_created ON public.order_messages(order_id, created_at DESC);

-- Comentários para documentação
COMMENT ON COLUMN public.orders.delivery_address_snapshot IS 'Snapshot do endereço no momento da criação do pedido para preservar histórico';
