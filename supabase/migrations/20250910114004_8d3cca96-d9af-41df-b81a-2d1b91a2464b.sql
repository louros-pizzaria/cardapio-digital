-- ===== FASE 3: ARQUITETURA DE FILA E PROCESSAMENTO ASSÍNCRONO =====

-- 1. Tabela de fila de processamento de pedidos
CREATE TABLE IF NOT EXISTS public.order_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_data JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5, -- 1 = highest, 10 = lowest
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_details JSONB,
  worker_id TEXT, -- ID do worker que está processando
  order_id UUID, -- ID do pedido criado (quando bem-sucedido)
  idempotency_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_order_queue_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para performance da fila
CREATE INDEX IF NOT EXISTS idx_order_queue_status_priority ON public.order_processing_queue(status, priority, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_order_queue_user_id ON public.order_processing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_order_queue_worker_id ON public.order_processing_queue(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_queue_idempotency ON public.order_processing_queue(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_queue_scheduled_at ON public.order_processing_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_order_queue_processing ON public.order_processing_queue(status, started_at) WHERE status = 'processing';

-- 2. Tabela de jobs assíncronos
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL, -- 'order_processing', 'email_notification', 'analytics', 'cleanup', etc.
  job_data JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_details JSONB,
  worker_id TEXT,
  result_data JSONB,
  timeout_seconds INTEGER DEFAULT 300, -- 5 minutos padrão
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para jobs assíncronos
CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status ON public.background_jobs(job_type, status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_priority ON public.background_jobs(status, priority, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_background_jobs_worker_id ON public.background_jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_background_jobs_scheduled_at ON public.background_jobs(scheduled_at) WHERE status = 'pending';

-- 3. Funções para gerenciamento da fila
CREATE OR REPLACE FUNCTION public.enqueue_order_processing(
  p_user_id UUID,
  p_order_data JSONB,
  p_priority INTEGER DEFAULT 5,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, queue_id UUID, message TEXT) AS $$
DECLARE
  v_queue_id UUID;
  v_is_vip BOOLEAN := FALSE;
  v_priority INTEGER := p_priority;
BEGIN
  -- Verificar se é usuário VIP (pode ser baseado em assinatura, histórico, etc.)
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND (role = 'admin' OR created_at < now() - INTERVAL '30 days')
  ) INTO v_is_vip;
  
  -- Ajustar prioridade para VIPs
  IF v_is_vip THEN
    v_priority := GREATEST(1, p_priority - 2);
  END IF;
  
  -- Verificar idempotência
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_queue_id 
    FROM public.order_processing_queue 
    WHERE idempotency_key = p_idempotency_key 
    AND status IN ('pending', 'processing', 'completed');
    
    IF FOUND THEN
      RETURN QUERY SELECT FALSE, v_queue_id, 'Pedido já está na fila ou foi processado';
      RETURN;
    END IF;
  END IF;
  
  -- Adicionar à fila
  INSERT INTO public.order_processing_queue 
  (user_id, order_data, priority, idempotency_key)
  VALUES (p_user_id, p_order_data, v_priority, p_idempotency_key)
  RETURNING id INTO v_queue_id;
  
  RETURN QUERY SELECT TRUE, v_queue_id, 'Pedido adicionado à fila com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Função para processar próximo item da fila
CREATE OR REPLACE FUNCTION public.dequeue_next_order(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 1
) RETURNS TABLE(
  queue_id UUID,
  user_id UUID,
  order_data JSONB,
  priority INTEGER,
  attempts INTEGER,
  idempotency_key TEXT
) AS $$
DECLARE
  v_queue_item RECORD;
BEGIN
  -- Buscar e bloquear próximo item da fila
  FOR v_queue_item IN
    SELECT q.id, q.user_id, q.order_data, q.priority, q.attempts, q.idempotency_key
    FROM public.order_processing_queue q
    WHERE q.status = 'pending' 
    AND q.scheduled_at <= now()
    AND q.attempts < q.max_attempts
    ORDER BY q.priority ASC, q.scheduled_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Marcar como processando
    UPDATE public.order_processing_queue 
    SET 
      status = 'processing',
      started_at = now(),
      worker_id = p_worker_id,
      attempts = attempts + 1,
      updated_at = now()
    WHERE id = v_queue_item.id;
    
    -- Retornar item
    RETURN QUERY SELECT 
      v_queue_item.id,
      v_queue_item.user_id,
      v_queue_item.order_data,
      v_queue_item.priority,
      v_queue_item.attempts,
      v_queue_item.idempotency_key;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Função para marcar item como completado
CREATE OR REPLACE FUNCTION public.complete_queue_item(
  p_queue_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_result_data JSONB DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Função para marcar item como falhado
CREATE OR REPLACE FUNCTION public.fail_queue_item(
  p_queue_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL,
  p_reschedule_seconds INTEGER DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_current_attempts INTEGER;
  v_max_attempts INTEGER;
  v_new_status TEXT;
  v_scheduled_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar informações atuais
  SELECT attempts, max_attempts INTO v_current_attempts, v_max_attempts
  FROM public.order_processing_queue 
  WHERE id = p_queue_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Item não encontrado';
    RETURN;
  END IF;
  
  -- Determinar próximo estado
  IF v_current_attempts >= v_max_attempts THEN
    v_new_status := 'failed';
    v_scheduled_at := NULL;
  ELSE
    v_new_status := 'pending';
    -- Reagendar com backoff exponencial
    v_scheduled_at := now() + 
      COALESCE(p_reschedule_seconds, POWER(2, v_current_attempts) * 60)::INTEGER * INTERVAL '1 second';
  END IF;
  
  -- Atualizar item
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Função para adicionar job assíncrono
CREATE OR REPLACE FUNCTION public.enqueue_background_job(
  p_job_type TEXT,
  p_job_data JSONB,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  p_timeout_seconds INTEGER DEFAULT 300
) RETURNS TABLE(success BOOLEAN, job_id UUID, message TEXT) AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.background_jobs 
  (job_type, job_data, priority, scheduled_at, timeout_seconds)
  VALUES (p_job_type, p_job_data, p_priority, p_scheduled_at, p_timeout_seconds)
  RETURNING id INTO v_job_id;
  
  RETURN QUERY SELECT TRUE, v_job_id, 'Job adicionado à fila com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Função de limpeza de itens antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_items()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Remover itens completados/falhados antigos (7 dias)
  DELETE FROM public.order_processing_queue 
  WHERE status IN ('completed', 'failed') 
  AND updated_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Resetar itens processando orfãos (1 hora sem atualização)
  UPDATE public.order_processing_queue 
  SET 
    status = 'pending',
    started_at = NULL,
    worker_id = NULL,
    scheduled_at = now() + INTERVAL '5 minutes' -- Reagendar em 5 minutos
  WHERE status = 'processing' 
  AND started_at < now() - INTERVAL '1 hour';
  
  -- Limpar jobs antigos
  DELETE FROM public.background_jobs 
  WHERE status IN ('completed', 'failed') 
  AND updated_at < now() - INTERVAL '7 days';
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Trigger para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_queue_updated_at
  BEFORE UPDATE ON public.order_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_queue_timestamp();

CREATE TRIGGER update_background_jobs_updated_at
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_queue_timestamp();

-- 10. RLS Policies
ALTER TABLE public.order_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Policies para order_processing_queue
CREATE POLICY "Users can view their own queue items" ON public.order_processing_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items" ON public.order_processing_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage queue items" ON public.order_processing_queue
  FOR ALL USING (true);

CREATE POLICY "Admins can manage all queue items" ON public.order_processing_queue
  FOR ALL USING (has_role('admin'::text));

-- Policies para background_jobs
CREATE POLICY "Admins can view background jobs" ON public.background_jobs
  FOR SELECT USING (has_role('admin'::text));

CREATE POLICY "System can manage background jobs" ON public.background_jobs
  FOR ALL USING (true);

-- 11. Agendar limpeza automática da fila a cada hora
SELECT cron.schedule(
  'cleanup-queue-items',
  '0 * * * *', -- A cada hora
  $$SELECT public.cleanup_old_queue_items();$$
);