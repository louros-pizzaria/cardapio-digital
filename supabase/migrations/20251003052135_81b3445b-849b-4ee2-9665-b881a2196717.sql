-- ===== ADICIONAR STATUS "pending_payment" PARA PEDIDOS AGUARDANDO PAGAMENTO ONLINE =====
-- Este status é usado quando o pedido foi criado mas o pagamento ainda não foi confirmado
-- Apenas após o webhook do Mercado Pago confirmar o pagamento, o pedido vai para "pending"

-- Adicionar novo valor ao enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'pending';

-- Comentário explicativo
COMMENT ON TYPE order_status IS 'Status do pedido: pending_payment (aguardando confirmação de pagamento online), pending (novo pedido confirmado), confirmed, preparing, ready, in_delivery, delivered, cancelled, expired';