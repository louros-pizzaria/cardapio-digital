-- ===== CORREÇÃO DA RECURSÃO INFINITA NAS POLÍTICAS RLS =====

-- 1. Criar função security definer para verificar roles (evita recursão)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Criar função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role::text = required_role
  );
$$;

-- 3. Criar função para verificar múltiplos roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role::text = ANY(required_roles)
  );
$$;

-- 4. Remover todas as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 5. Criar novas políticas RLS sem recursão usando as funções security definer
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING (public.has_role('admin'));

-- 6. Atualizar outras políticas que podem ter problemas similares
-- Política para orders
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (public.has_role('admin'));

-- Política para products  
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.has_role('admin'));

-- Política para categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.has_role('admin'));

-- Política para subcategories
DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
CREATE POLICY "Admins can manage subcategories"
ON public.subcategories
FOR ALL
USING (public.has_role('admin'));

-- 7. Criar políticas para attendants
CREATE POLICY "Attendants can view orders"
ON public.orders
FOR SELECT
USING (public.has_any_role(ARRAY['admin', 'attendant']));

CREATE POLICY "Attendants can update order status"
ON public.orders
FOR UPDATE
USING (public.has_any_role(ARRAY['admin', 'attendant']));

-- 8. Atualizar função is_admin existente para usar nova estrutura
DROP FUNCTION IF EXISTS public.is_admin(uuid);
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('admin');
$$;