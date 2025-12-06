-- Corrigir a função get_current_user_role
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'customer')::text 
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

-- Atualizar as policies da tabela profiles para serem mais diretas
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

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

-- Garantir que todos os usuários possam ler seu próprio perfil
DROP POLICY IF EXISTS "Users can view their profile" ON public.profiles;

CREATE POLICY "Users can view their profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);

-- Política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid() 
    AND p2.role = 'admin'
  )
);