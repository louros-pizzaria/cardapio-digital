-- ===== FASE 1: CORREÇÃO CRÍTICA DO SISTEMA DE ROLES =====
-- Passo 1: Atualizar políticas RLS que dependem de profiles.role

-- 1. Verificar e migrar qualquer role que ainda falte em user_roles
DO $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT p.id, p.role::user_role
  FROM public.profiles p
  WHERE p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role::text = p.role::text
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- 2. Atualizar política order_items que usa profiles.role
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items"
ON public.order_items
FOR ALL
USING (has_role('admin'));

-- 3. Atualizar política subscriptions que usa profiles.role
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions
FOR ALL
USING (has_role('admin'));

-- 4. Atualizar política delivery_zones que usa profiles.role
DROP POLICY IF EXISTS "Admins can manage delivery zones" ON public.delivery_zones;
CREATE POLICY "Admins can manage delivery zones"
ON public.delivery_zones
FOR ALL
USING (has_role('admin'));

-- 5. Atualizar política profiles - impedir atualização de role (não existe mais)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Criar trigger para auto-atribuir role 'customer' em novos usuários
CREATE OR REPLACE FUNCTION public.assign_default_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_customer_role();

-- 7. Confirmar que funções has_role e has_any_role usam user_roles
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = ANY(required_roles)
  );
$$;

-- 8. Agora podemos remover a coluna role de profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- 9. Documentação
COMMENT ON TABLE public.user_roles IS 
'✅ TABELA AUTORITATIVA PARA ROLES
Esta é a ÚNICA fonte de verdade para permissões.
Funções has_role() leem EXCLUSIVAMENTE desta tabela.';

COMMENT ON FUNCTION public.has_role IS 
'✅ Verifica role do usuário autenticado.
SECURITY DEFINER com search_path fixo.
Lê de user_roles.';

COMMENT ON FUNCTION public.has_any_role IS 
'✅ Verifica múltiplas roles do usuário.
SECURITY DEFINER com search_path fixo.
Lê de user_roles.';