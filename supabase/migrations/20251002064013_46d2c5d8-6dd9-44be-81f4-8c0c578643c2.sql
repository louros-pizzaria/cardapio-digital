-- ===== FASE 3: SISTEMA DE AUDITORIA E LOGS =====

-- 1. Tabela de logs de ações do admin
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'product', 'order', 'store', 'user', etc
  entity_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_admin_action_logs_admin_id ON public.admin_action_logs(admin_id);
CREATE INDEX idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);
CREATE INDEX idx_admin_action_logs_entity ON public.admin_action_logs(entity_type, entity_id);

-- RLS
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view action logs"
  ON public.admin_action_logs FOR SELECT
  TO authenticated
  USING (has_role('admin'));

CREATE POLICY "System can insert action logs"
  ON public.admin_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Tabela de logs de status da loja
CREATE TABLE IF NOT EXISTS public.store_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by UUID NOT NULL,
  is_open BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice
CREATE INDEX idx_store_status_logs_created_at ON public.store_status_logs(created_at DESC);

-- RLS
ALTER TABLE public.store_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view store status logs"
  ON public.store_status_logs FOR SELECT
  TO authenticated
  USING (has_role('admin'));

CREATE POLICY "Admins can insert store status logs"
  ON public.store_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_role('admin'));

-- 3. Função para registrar ação do admin
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.admin_action_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    changes
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 4. Trigger para logar mudanças de status da loja
CREATE OR REPLACE FUNCTION public.log_store_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.is_open IS DISTINCT FROM NEW.is_open) THEN
    INSERT INTO public.store_status_logs (
      changed_by,
      is_open,
      reason
    ) VALUES (
      auth.uid(),
      NEW.is_open,
      CASE 
        WHEN NEW.is_open THEN 'Loja aberta'
        ELSE 'Loja fechada: ' || COALESCE(NEW.closed_message, 'Sem motivo especificado')
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER store_status_change_trigger
  AFTER UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_store_status_change();

-- 5. Trigger para logar pausas de produtos
CREATE OR REPLACE FUNCTION public.log_product_pause_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_admin_action(
      'product_paused',
      'product',
      NEW.product_id,
      jsonb_build_object(
        'reason', NEW.reason,
        'paused_at', NEW.paused_at,
        'resume_at', NEW.resume_at
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active AND NOT NEW.is_active THEN
    PERFORM public.log_admin_action(
      'product_pause_ended',
      'product',
      NEW.product_id,
      jsonb_build_object(
        'resumed_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_pause_log_trigger
  AFTER INSERT OR UPDATE ON public.product_pauses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_product_pause_change();

-- 6. View para dashboard de estatísticas em tempo real
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT
  -- Pedidos hoje
  COUNT(DISTINCT CASE WHEN o.created_at >= CURRENT_DATE THEN o.id END) as orders_today,
  
  -- Receita hoje
  COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE AND o.status != 'cancelled' 
    THEN o.total_amount ELSE 0 END), 0) as revenue_today,
  
  -- Pedidos esta semana
  COUNT(DISTINCT CASE WHEN o.created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN o.id END) as orders_this_week,
  
  -- Receita esta semana
  COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('week', CURRENT_DATE) AND o.status != 'cancelled'
    THEN o.total_amount ELSE 0 END), 0) as revenue_this_week,
  
  -- Pedidos este mês
  COUNT(DISTINCT CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN o.id END) as orders_this_month,
  
  -- Receita este mês
  COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) AND o.status != 'cancelled'
    THEN o.total_amount ELSE 0 END), 0) as revenue_this_month,
  
  -- Pedidos pendentes
  COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
  
  -- Pedidos em andamento
  COUNT(DISTINCT CASE WHEN o.status IN ('confirmed', 'preparing') THEN o.id END) as active_orders,
  
  -- Total de produtos
  COUNT(DISTINCT p.id) as total_products,
  
  -- Produtos ativos
  COUNT(DISTINCT CASE WHEN p.is_available THEN p.id END) as active_products,
  
  -- Total de clientes
  COUNT(DISTINCT pr.id) as total_customers,
  
  -- Ticket médio
  COALESCE(AVG(CASE WHEN o.status != 'cancelled' THEN o.total_amount END), 0) as average_ticket
  
FROM public.orders o
CROSS JOIN public.products p
CROSS JOIN public.profiles pr
WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days';

-- 7. Função para obter dados de gráfico de evolução
CREATE OR REPLACE FUNCTION public.get_revenue_chart_data(
  p_period TEXT DEFAULT 'week', -- 'week', 'month', 'year'
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE(
  period_date DATE,
  total_orders BIGINT,
  total_revenue NUMERIC,
  avg_ticket NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  -- Verificar se é admin
  IF NOT has_role('admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Determinar data inicial
  CASE p_period
    WHEN 'week' THEN
      v_start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'month' THEN
      v_start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'year' THEN
      v_start_date := CURRENT_DATE - INTERVAL '12 months';
    ELSE
      v_start_date := CURRENT_DATE - INTERVAL '30 days';
  END CASE;
  
  RETURN QUERY
  SELECT
    DATE(o.created_at) as period_date,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
    COALESCE(AVG(CASE WHEN o.status != 'cancelled' THEN o.total_amount END), 0) as avg_ticket
  FROM public.orders o
  WHERE o.created_at >= v_start_date
  GROUP BY DATE(o.created_at)
  ORDER BY period_date DESC
  LIMIT p_limit;
END;
$$;