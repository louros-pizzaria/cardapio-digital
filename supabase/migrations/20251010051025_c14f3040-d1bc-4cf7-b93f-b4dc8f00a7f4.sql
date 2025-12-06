-- ===== CONFIGURAÇÃO AVANÇADA DE REALTIME =====

-- Garantir REPLICA IDENTITY FULL para capturar todas as mudanças
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_zones REPLICA IDENTITY FULL;
ALTER TABLE public.product_extras REPLICA IDENTITY FULL;
ALTER TABLE public.product_crusts REPLICA IDENTITY FULL;

-- Criar índices otimizados para queries do atendente
CREATE INDEX IF NOT EXISTS idx_orders_status_created 
  ON public.orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
  ON public.orders(payment_status) 
  WHERE payment_status IS DISTINCT FROM 'paid';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime otimizado com sucesso!';
END $$;