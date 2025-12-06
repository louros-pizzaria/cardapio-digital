-- Corrigir avisos de segurança adicionando search_path às funções

-- 1. Corrigir função atomic_reserve_stock
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Corrigir função atomic_release_stock
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Corrigir função atomic_confirm_stock
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Corrigir função cleanup_expired_stock_reservations
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;