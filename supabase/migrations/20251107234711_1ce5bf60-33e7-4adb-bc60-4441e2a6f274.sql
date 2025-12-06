-- Tabela para registrar tentativas de pedidos fora do horário
CREATE TABLE IF NOT EXISTS public.store_closed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT,
  user_name TEXT,
  user_phone TEXT,
  cart_value NUMERIC(10, 2),
  cart_items_count INTEGER,
  source TEXT NOT NULL, -- 'web', 'mobile', 'api'
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  store_schedule JSONB, -- snapshot do horário no momento
  next_opening TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_store_closed_attempts_user_id ON public.store_closed_attempts(user_id);
CREATE INDEX idx_store_closed_attempts_attempted_at ON public.store_closed_attempts(attempted_at DESC);
CREATE INDEX idx_store_closed_attempts_created_at ON public.store_closed_attempts(created_at DESC);

-- Tabela para configurações de notificações
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_email TEXT,
  in_app_notifications BOOLEAN NOT NULL DEFAULT true,
  min_attempts_threshold INTEGER NOT NULL DEFAULT 3, -- Notificar após X tentativas
  time_window_minutes INTEGER NOT NULL DEFAULT 60, -- Janela de tempo para contar tentativas
  notification_frequency TEXT NOT NULL DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily'
  last_notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.notification_settings (id, enabled, email_notifications, in_app_notifications)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para store_closed_attempts
ALTER TABLE public.store_closed_attempts ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as tentativas
CREATE POLICY "Admins can view all closed attempts"
  ON public.store_closed_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role pode inserir tentativas
CREATE POLICY "Service role can insert attempts"
  ON public.store_closed_attempts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policies para notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e atualizar configurações
CREATE POLICY "Admins can view notification settings"
  ON public.notification_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update notification settings"
  ON public.notification_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Função para limpar tentativas antigas (manter últimos 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_closed_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.store_closed_attempts
  WHERE created_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter estatísticas de tentativas
CREATE OR REPLACE FUNCTION public.get_closed_attempts_stats(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE(
  total_attempts BIGINT,
  unique_users BIGINT,
  total_lost_revenue NUMERIC,
  avg_cart_value NUMERIC,
  most_common_hour INTEGER,
  attempts_by_hour JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH hourly_stats AS (
    SELECT 
      EXTRACT(HOUR FROM attempted_at)::INTEGER as hour,
      COUNT(*) as attempts
    FROM public.store_closed_attempts
    WHERE attempted_at BETWEEN p_start_date AND p_end_date
    GROUP BY EXTRACT(HOUR FROM attempted_at)
  )
  SELECT
    COUNT(*)::BIGINT as total_attempts,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COALESCE(SUM(cart_value), 0) as total_lost_revenue,
    COALESCE(AVG(cart_value), 0) as avg_cart_value,
    (SELECT hour FROM hourly_stats ORDER BY attempts DESC LIMIT 1) as most_common_hour,
    (SELECT jsonb_object_agg(hour::text, attempts) FROM hourly_stats) as attempts_by_hour
  FROM public.store_closed_attempts
  WHERE attempted_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.store_closed_attempts IS 'Registra tentativas de pedidos quando a loja está fechada';
COMMENT ON TABLE public.notification_settings IS 'Configurações de notificações para tentativas fora do horário';
COMMENT ON FUNCTION public.get_closed_attempts_stats IS 'Retorna estatísticas agregadas de tentativas fora do horário';