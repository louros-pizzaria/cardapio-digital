-- Primeiro remover a policy que depende da função
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Agora remover a função
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Recriar políticas mais diretas e eficientes
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Garantir que usuários possam ver e editar apenas seu próprio perfil
DROP POLICY IF EXISTS "Users can view their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profile (except role)" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Política para usuários verem seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);

-- Política para usuários atualizarem seu próprio perfil (exceto role)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Política para inserir próprio perfil
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Criar função simplificada para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND role = 'admin'
  );
$$;