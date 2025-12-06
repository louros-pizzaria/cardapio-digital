-- ===== FASE 2: SISTEMA DE ESTOQUE ATÔMICO E TRANSACIONAL =====

-- 1. Tabela de controle de estoque atômico
CREATE TABLE IF NOT EXISTS public.product_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER GENERATED ALWAYS AS (available_quantity + reserved_quantity) STORED,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_product_stock_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_stock_quantities_check CHECK (available_quantity >= 0 AND reserved_quantity >= 0)
);

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_stock_product_id ON public.product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_available ON public.product_stock(available_quantity) WHERE available_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_product_stock_low_stock ON public.product_stock(product_id) WHERE available_quantity <= reorder_level;

-- 2. Tabela de reservas temporárias
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 minutes'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'expired', 'cancelled')),
  order_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_stock_reservations_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT stock_reservations_quantity_check CHECK (quantity > 0)
);

-- Índices para reservas
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_user ON public.stock_reservations(product_id, user_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON public.stock_reservations(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_key ON public.stock_reservations(order_key) WHERE order_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON public.stock_reservations(status);

-- 3. Tabela de auditoria de estoque
CREATE TABLE IF NOT EXISTS public.stock_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL, -- 'reserve', 'release', 'confirm', 'adjust', 'restock'
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  order_id UUID,
  reservation_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_stock_audit_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_stock_audit_product_id ON public.stock_audit_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_user_id ON public.stock_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_action ON public.stock_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_stock_audit_created_at ON public.stock_audit_logs(created_at);

-- 4. Funções para operações atômicas
CREATE OR REPLACE FUNCTION public.atomic_reserve_stock(
  p_product_id UUID,
  p_user_id UUID,
  p_quantity INTEGER,
  p_order_key TEXT DEFAULT NULL,
  p_ttl_minutes INTEGER DEFAULT 2
) RETURNS TABLE(success BOOLEAN, reservation_id UUID, message TEXT) AS $$
DECLARE
  v_available INTEGER;
  v_reservation_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validar parâmetros
  IF p_quantity <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Quantidade deve ser maior que zero';
    RETURN;
  END IF;

  -- Calcular expiração
  v_expires_at := now() + (p_ttl_minutes || ' minutes')::INTERVAL;

  -- Lock da linha do produto para operação atômica
  SELECT available_quantity INTO v_available
  FROM public.product_stock 
  WHERE product_id = p_product_id
  FOR UPDATE;

  -- Verificar se produto existe
  IF NOT FOUND THEN
    -- Inicializar estoque se produto não existir
    INSERT INTO public.product_stock (product_id, available_quantity)
    VALUES (p_product_id, 1000); -- Estoque inicial padrão
    v_available := 1000;
  END IF;

  -- Verificar disponibilidade
  IF v_available < p_quantity THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      FORMAT('Estoque insuficiente. Disponível: %s, Solicitado: %s', v_available, p_quantity);
    RETURN;
  END IF;

  -- Criar reserva
  INSERT INTO public.stock_reservations 
  (product_id, user_id, quantity, expires_at, order_key)
  VALUES (p_product_id, p_user_id, p_quantity, v_expires_at, p_order_key)
  RETURNING id INTO v_reservation_id;

  -- Atualizar estoque
  UPDATE public.product_stock 
  SET 
    available_quantity = available_quantity - p_quantity,
    reserved_quantity = reserved_quantity + p_quantity,
    updated_at = now()
  WHERE product_id = p_product_id;

  -- Log de auditoria
  INSERT INTO public.stock_audit_logs 
  (product_id, user_id, action, quantity_before, quantity_after, quantity_change, reason, reservation_id)
  VALUES (p_product_id, p_user_id, 'reserve', v_available, v_available - p_quantity, -p_quantity, 
          'Reserva temporária', v_reservation_id);

  RETURN QUERY SELECT TRUE, v_reservation_id, 'Estoque reservado com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para liberar reserva
CREATE OR REPLACE FUNCTION public.atomic_release_stock(
  p_reservation_id UUID,
  p_reason TEXT DEFAULT 'Manual release'
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_product_id UUID;
  v_quantity INTEGER;
  v_status TEXT;
BEGIN
  -- Buscar e bloquear reserva
  SELECT product_id, quantity, status 
  INTO v_product_id, v_quantity, v_status
  FROM public.stock_reservations 
  WHERE id = p_reservation_id
  FOR UPDATE;

  -- Verificar se reserva existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reserva não encontrada';
    RETURN;
  END IF;

  -- Verificar se já foi processada
  IF v_status != 'active' THEN
    RETURN QUERY SELECT FALSE, FORMAT('Reserva já está %s', v_status);
    RETURN;
  END IF;

  -- Marcar reserva como cancelada
  UPDATE public.stock_reservations 
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_reservation_id;

  -- Liberar estoque
  UPDATE public.product_stock 
  SET 
    available_quantity = available_quantity + v_quantity,
    reserved_quantity = reserved_quantity - v_quantity,
    updated_at = now()
  WHERE product_id = v_product_id;

  -- Log de auditoria
  INSERT INTO public.stock_audit_logs 
  (product_id, action, quantity_before, quantity_after, quantity_change, reason, reservation_id)
  SELECT v_product_id, 'release', 
         ps.available_quantity - v_quantity, ps.available_quantity, v_quantity,
         p_reason, p_reservation_id
  FROM public.product_stock ps WHERE ps.product_id = v_product_id;

  RETURN QUERY SELECT TRUE, 'Estoque liberado com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para confirmar reserva (converter em venda)
CREATE OR REPLACE FUNCTION public.atomic_confirm_stock(
  p_reservation_id UUID,
  p_order_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_product_id UUID;
  v_quantity INTEGER;
  v_status TEXT;
  v_user_id UUID;
BEGIN
  -- Buscar e bloquear reserva
  SELECT product_id, quantity, status, user_id
  INTO v_product_id, v_quantity, v_status, v_user_id
  FROM public.stock_reservations 
  WHERE id = p_reservation_id
  FOR UPDATE;

  -- Verificar se reserva existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reserva não encontrada';
    RETURN;
  END IF;

  -- Verificar se já foi processada
  IF v_status != 'active' THEN
    RETURN QUERY SELECT FALSE, FORMAT('Reserva já está %s', v_status);
    RETURN;
  END IF;

  -- Marcar reserva como confirmada
  UPDATE public.stock_reservations 
  SET status = 'confirmed', updated_at = now()
  WHERE id = p_reservation_id;

  -- Confirmar venda (reduzir estoque reservado)
  UPDATE public.product_stock 
  SET 
    reserved_quantity = reserved_quantity - v_quantity,
    updated_at = now()
  WHERE product_id = v_product_id;

  -- Log de auditoria
  INSERT INTO public.stock_audit_logs 
  (product_id, user_id, action, quantity_before, quantity_after, quantity_change, reason, order_id, reservation_id)
  SELECT v_product_id, v_user_id, 'confirm', 
         ps.reserved_quantity + v_quantity, ps.reserved_quantity, -v_quantity,
         'Venda confirmada', p_order_id, p_reservation_id
  FROM public.product_stock ps WHERE ps.product_id = v_product_id;

  RETURN QUERY SELECT TRUE, 'Venda confirmada com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função para limpeza automática de reservas expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_stock_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_reservation RECORD;
BEGIN
  -- Buscar reservas expiradas
  FOR v_reservation IN 
    SELECT id, product_id, quantity
    FROM public.stock_reservations 
    WHERE status = 'active' AND expires_at <= now()
    FOR UPDATE
  LOOP
    -- Marcar como expirada
    UPDATE public.stock_reservations 
    SET status = 'expired', updated_at = now()
    WHERE id = v_reservation.id;

    -- Liberar estoque
    UPDATE public.product_stock 
    SET 
      available_quantity = available_quantity + v_reservation.quantity,
      reserved_quantity = reserved_quantity - v_reservation.quantity,
      updated_at = now()
    WHERE product_id = v_reservation.product_id;

    -- Log de auditoria
    INSERT INTO public.stock_audit_logs 
    (product_id, action, quantity_before, quantity_after, quantity_change, reason, reservation_id)
    SELECT v_reservation.product_id, 'release', 
           ps.available_quantity - v_reservation.quantity, ps.available_quantity, v_reservation.quantity,
           'Reserva expirada - cleanup automático', v_reservation.id
    FROM public.product_stock ps WHERE ps.product_id = v_reservation.product_id;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_product_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_stock_updated_at
  BEFORE UPDATE ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_timestamp();

-- 9. RLS Policies
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies para product_stock
CREATE POLICY "Anyone can view product stock" ON public.product_stock
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product stock" ON public.product_stock
  FOR ALL USING (has_role('admin'::text));

-- Policies para stock_reservations  
CREATE POLICY "Users can view their own reservations" ON public.stock_reservations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations" ON public.stock_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update reservations" ON public.stock_reservations
  FOR UPDATE USING (true);

CREATE POLICY "Admins can manage all reservations" ON public.stock_reservations
  FOR ALL USING (has_role('admin'::text));

-- Policies para stock_audit_logs
CREATE POLICY "Admins can view audit logs" ON public.stock_audit_logs
  FOR SELECT USING (has_role('admin'::text));

CREATE POLICY "System can insert audit logs" ON public.stock_audit_logs
  FOR INSERT WITH CHECK (true);

-- 10. Inicializar estoque para produtos existentes
INSERT INTO public.product_stock (product_id, available_quantity)
SELECT id, 100 -- Estoque inicial de 100 unidades
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_stock ps WHERE ps.product_id = p.id
)
ON CONFLICT (product_id) DO NOTHING;

-- 11. Agendar limpeza automática a cada minuto
SELECT cron.schedule(
  'cleanup-expired-stock-reservations',
  '* * * * *', -- A cada minuto
  $$SELECT public.cleanup_expired_stock_reservations();$$
);