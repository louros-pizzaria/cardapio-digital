-- ===== FASE 1: RECRIAR TODAS AS FUNÇÕES SECURITY DEFINER =====

-- Deletar TODAS as versões antigas das funções COM CASCADE
DROP FUNCTION IF EXISTS public.has_any_role(text[]) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_primary_role(_user_id uuid) CASCADE;

-- Criar função has_role (nova versão simplificada)
CREATE FUNCTION public.has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text = _role
  )
$$;

-- Criar função has_any_role (nova versão simplificada)
CREATE FUNCTION public.has_any_role(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text = ANY(_roles)
  )
$$;

-- Criar função get_user_primary_role (nova versão)
CREATE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'attendant' THEN 2
      WHEN 'seller' THEN 3
      WHEN 'customer' THEN 4
    END
  LIMIT 1
$$;

-- RECRIAR AS POLÍTICAS RLS (caso tenham sido removidas pelo CASCADE)
DO $$ 
BEGIN
  -- Políticas da tabela orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Attendants can view orders') THEN
    CREATE POLICY "Attendants can view orders"
    ON public.orders
    FOR SELECT
    USING (has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Attendants can update order status') THEN
    CREATE POLICY "Attendants can update order status"
    ON public.orders
    FOR UPDATE
    USING (has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  -- Políticas da tabela external_orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'external_orders' AND policyname = 'Attendants can view external orders') THEN
    CREATE POLICY "Attendants can view external orders"
    ON public.external_orders
    FOR SELECT
    USING (has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  -- Políticas da tabela rum_metrics
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rum_metrics' AND policyname = 'Users can view their own metrics') THEN
    CREATE POLICY "Users can view their own metrics"
    ON public.rum_metrics
    FOR SELECT
    USING ((auth.uid() = user_id) OR (user_id IS NULL) OR has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  -- Políticas da tabela error_reports
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_reports' AND policyname = 'Users can view their own error reports') THEN
    CREATE POLICY "Users can view their own error reports"
    ON public.error_reports
    FOR SELECT
    USING ((auth.uid() = user_id) OR (user_id IS NULL) OR has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  -- Políticas da tabela order_messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_messages' AND policyname = 'Attendants can view all messages') THEN
    CREATE POLICY "Attendants can view all messages"
    ON public.order_messages
    FOR SELECT
    USING (has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_messages' AND policyname = 'Attendants can send messages to any order') THEN
    CREATE POLICY "Attendants can send messages to any order"
    ON public.order_messages
    FOR INSERT
    WITH CHECK ((sender_type = 'attendant') AND has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_messages' AND policyname = 'Attendants can mark messages as read') THEN
    CREATE POLICY "Attendants can mark messages as read"
    ON public.order_messages
    FOR UPDATE
    USING (has_any_role(ARRAY['admin', 'attendant']))
    WITH CHECK (has_any_role(ARRAY['admin', 'attendant']));
  END IF;

  -- Políticas da tabela delivery_drivers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_drivers' AND policyname = 'Attendants can view delivery drivers') THEN
    CREATE POLICY "Attendants can view delivery drivers"
    ON public.delivery_drivers
    FOR SELECT
    USING (has_any_role(ARRAY['admin', 'attendant']));
  END IF;
END $$;