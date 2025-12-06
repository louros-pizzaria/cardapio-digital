-- =====================================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA E RLS (Corrigido)
-- =====================================================

-- 1. ADICIONAR SEARCH_PATH EM FUNÇÕES CRÍTICAS
CREATE OR REPLACE FUNCTION public.enqueue_background_job(p_job_type text, p_job_data jsonb, p_priority integer DEFAULT 5, p_scheduled_at timestamp with time zone DEFAULT now(), p_timeout_seconds integer DEFAULT 300)
RETURNS TABLE(success boolean, job_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.background_jobs 
  (job_type, job_data, priority, scheduled_at, timeout_seconds)
  VALUES (p_job_type, p_job_data, p_priority, p_scheduled_at, p_timeout_seconds)
  RETURNING id INTO v_job_id;
  
  RETURN QUERY SELECT TRUE, v_job_id, 'Job adicionado à fila com sucesso';
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_queue_item(p_queue_id uuid, p_order_id uuid DEFAULT NULL::uuid, p_result_data jsonb DEFAULT NULL::jsonb)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.order_processing_queue 
  SET 
    status = 'completed',
    completed_at = now(),
    order_id = p_order_id,
    updated_at = now()
  WHERE id = p_queue_id 
  AND status = 'processing';
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Item marcado como completado';
  ELSE
    RETURN QUERY SELECT FALSE, 'Item não encontrado ou não estava processando';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_queue_item(p_queue_id uuid, p_error_message text, p_error_details jsonb DEFAULT NULL::jsonb, p_reschedule_seconds integer DEFAULT NULL::integer)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_attempts INTEGER;
  v_max_attempts INTEGER;
  v_new_status TEXT;
  v_scheduled_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT attempts, max_attempts INTO v_current_attempts, v_max_attempts
  FROM public.order_processing_queue 
  WHERE id = p_queue_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Item não encontrado';
    RETURN;
  END IF;
  
  IF v_current_attempts >= v_max_attempts THEN
    v_new_status := 'failed';
    v_scheduled_at := NULL;
  ELSE
    v_new_status := 'pending';
    v_scheduled_at := now() + 
      COALESCE(p_reschedule_seconds, POWER(2, v_current_attempts) * 60)::INTEGER * INTERVAL '1 second';
  END IF;
  
  UPDATE public.order_processing_queue 
  SET 
    status = v_new_status,
    failed_at = CASE WHEN v_new_status = 'failed' THEN now() ELSE NULL END,
    scheduled_at = COALESCE(v_scheduled_at, scheduled_at),
    error_message = p_error_message,
    error_details = p_error_details,
    worker_id = NULL,
    started_at = NULL,
    updated_at = now()
  WHERE id = p_queue_id;
  
  RETURN QUERY SELECT TRUE, 
    CASE 
      WHEN v_new_status = 'failed' THEN 'Item marcado como falhado permanentemente'
      ELSE FORMAT('Item reagendado para %s', v_scheduled_at)
    END;
END;
$function$;

-- 2. RECRIAR MATERIALIZED VIEW SEM SECURITY DEFINER
DROP MATERIALIZED VIEW IF EXISTS public.admin_stats_view CASCADE;

CREATE MATERIALIZED VIEW public.admin_stats_view AS
SELECT 
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as orders_today,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE)) as orders_this_week,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as orders_this_month,
  COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE AND status != 'cancelled'), 0) as revenue_today,
  COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE) AND status != 'cancelled'), 0) as revenue_this_week,
  COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status != 'cancelled'), 0) as revenue_this_month,
  COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing')) as active_orders,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
  (SELECT COUNT(*) FROM public.products) as total_products,
  (SELECT COUNT(*) FROM public.products WHERE is_available = true) as active_products,
  (SELECT COUNT(DISTINCT user_id) FROM public.orders) as total_customers,
  COALESCE(AVG(total_amount) FILTER (WHERE status != 'cancelled'), 0) as average_ticket
FROM public.orders;

CREATE INDEX IF NOT EXISTS idx_orders_stats_refresh ON public.orders(created_at, status, total_amount);
GRANT SELECT ON public.admin_stats_view TO authenticated;

-- 3. RLS POLICIES PARA TABELAS SEM PROTEÇÃO

-- fiscal_reports
ALTER TABLE public.fiscal_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view fiscal reports" ON public.fiscal_reports;
DROP POLICY IF EXISTS "System can insert fiscal reports" ON public.fiscal_reports;
DROP POLICY IF EXISTS "Admins can update fiscal reports" ON public.fiscal_reports;

CREATE POLICY "Admins can view fiscal reports" ON public.fiscal_reports FOR SELECT USING (has_role('admin'));
CREATE POLICY "System can insert fiscal reports" ON public.fiscal_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update fiscal reports" ON public.fiscal_reports FOR UPDATE USING (has_role('admin'));

-- delivery_integrations
ALTER TABLE public.delivery_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage delivery integrations" ON public.delivery_integrations;
CREATE POLICY "Admins can manage delivery integrations" ON public.delivery_integrations FOR ALL USING (has_role('admin'));

-- customer_segments
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage customer segments" ON public.customer_segments;
DROP POLICY IF EXISTS "Staff can view customer segments" ON public.customer_segments;
CREATE POLICY "Admins can manage customer segments" ON public.customer_segments FOR ALL USING (has_role('admin'));
CREATE POLICY "Staff can view customer segments" ON public.customer_segments FOR SELECT USING (has_any_role(ARRAY['admin', 'attendant']));

-- customer_segment_members
ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage segment members" ON public.customer_segment_members;
CREATE POLICY "Admins can manage segment members" ON public.customer_segment_members FOR ALL USING (has_role('admin'));

-- loyalty_rewards
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.loyalty_rewards;
CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage rewards" ON public.loyalty_rewards FOR ALL USING (has_role('admin'));

-- marketing_campaigns
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage marketing campaigns" ON public.marketing_campaigns;
CREATE POLICY "Admins can manage marketing campaigns" ON public.marketing_campaigns FOR ALL USING (has_role('admin'));

-- delivery_platform_orders
ALTER TABLE public.delivery_platform_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view platform orders" ON public.delivery_platform_orders;
DROP POLICY IF EXISTS "System can insert platform orders" ON public.delivery_platform_orders;
DROP POLICY IF EXISTS "System can update platform orders" ON public.delivery_platform_orders;
CREATE POLICY "Staff can view platform orders" ON public.delivery_platform_orders FOR SELECT USING (has_any_role(ARRAY['admin', 'attendant']));
CREATE POLICY "System can insert platform orders" ON public.delivery_platform_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update platform orders" ON public.delivery_platform_orders FOR UPDATE USING (true);

-- payment_reconciliation
ALTER TABLE public.payment_reconciliation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view reconciliation" ON public.payment_reconciliation;
DROP POLICY IF EXISTS "System can manage reconciliation" ON public.payment_reconciliation;
CREATE POLICY "Admins can view reconciliation" ON public.payment_reconciliation FOR SELECT USING (has_role('admin'));
CREATE POLICY "System can manage reconciliation" ON public.payment_reconciliation FOR ALL USING (true);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status, payment_method);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON public.order_items(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category_id, is_available);

-- 5. WEBHOOK SIGNATURES TABLE
CREATE TABLE IF NOT EXISTS public.webhook_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  signature text NOT NULL,
  payload jsonb NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

ALTER TABLE public.webhook_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage webhook signatures" ON public.webhook_signatures;
CREATE POLICY "System can manage webhook signatures" ON public.webhook_signatures FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_webhook_signatures_created ON public.webhook_signatures(created_at);

-- 6. CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_signatures()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.webhook_signatures WHERE created_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$function$;

-- 7. RATE LIMITING INDEX
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint, window_start DESC);
