-- ===== TABELA DE LOGS DE DEBUG DE ASSINATURA =====

CREATE TABLE IF NOT EXISTS public.subscription_debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL, -- 'debug', 'reconcile', 'clear_cache', 'force_sync'
  result jsonb,
  error text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_subscription_debug_logs_admin ON public.subscription_debug_logs(admin_id);
CREATE INDEX idx_subscription_debug_logs_target ON public.subscription_debug_logs(target_user_id);
CREATE INDEX idx_subscription_debug_logs_created ON public.subscription_debug_logs(created_at DESC);
CREATE INDEX idx_subscription_debug_logs_action ON public.subscription_debug_logs(action);

-- RLS Policies
ALTER TABLE public.subscription_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert debug logs"
  ON public.subscription_debug_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins can view debug logs"
  ON public.subscription_debug_logs
  FOR SELECT
  TO authenticated
  USING (has_role('admin'));

-- Função para limpar logs antigos (>30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_debug_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.subscription_debug_logs
  WHERE created_at < now() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE public.subscription_debug_logs IS 'Logs de debug de assinatura para admins';
COMMENT ON FUNCTION public.cleanup_old_debug_logs IS 'Remove logs de debug com mais de 30 dias';