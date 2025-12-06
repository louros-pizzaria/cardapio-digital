-- FASE 3: LIMPEZA DO BANCO DE DADOS

-- Remover registros órfãos (criados erroneamente pela verificação manual)
DELETE FROM public.subscriptions 
WHERE status = 'inactive' 
AND sync_status = 'manual' 
AND stripe_subscription_id IS NULL 
AND stripe_price_id IS NULL;

-- Remover registros com status pending orfãos
DELETE FROM public.subscriptions 
WHERE status = 'pending' 
AND sync_status = 'pending' 
AND created_at < now() - INTERVAL '7 days';

-- Criar índices para performance otimizada
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON public.subscriptions (user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_sync_status 
ON public.subscriptions (sync_status, status) 
WHERE sync_status = 'webhook';

-- Função para verificação dupla (FASE 4)
CREATE OR REPLACE FUNCTION public.validate_subscription_consistency()
RETURNS TABLE(user_id uuid, local_status text, sync_status text, inconsistency_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Identificar inconsistências entre dados locais e status de sync
  RETURN QUERY
  SELECT 
    s.user_id,
    s.status as local_status,
    s.sync_status,
    CASE 
      WHEN s.status = 'active' AND s.sync_status = 'manual' THEN 'manual_active_needs_verification'
      WHEN s.expires_at < now() AND s.status = 'active' THEN 'expired_but_active'
      WHEN s.stripe_subscription_id IS NULL AND s.status = 'active' THEN 'active_without_stripe_id'
      ELSE 'unknown'
    END as inconsistency_type
  FROM public.subscriptions s
  WHERE (
    (s.status = 'active' AND s.sync_status = 'manual') OR
    (s.expires_at < now() AND s.status = 'active') OR
    (s.stripe_subscription_id IS NULL AND s.status = 'active')
  );
END;
$$;