-- Configurações de segurança adicionais

-- 1. Criar função para verificar se produto está ativo e disponível
CREATE OR REPLACE FUNCTION public.validate_product_availability(product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM products 
    WHERE id = product_id 
    AND is_available = true
  );
$$;

-- 2. Criar trigger para validar quantidade máxima em order_items
CREATE OR REPLACE FUNCTION public.validate_order_item_quantity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Limitar quantidade máxima por item (20 unidades)
  IF NEW.quantity > 20 THEN
    RAISE EXCEPTION 'Quantidade máxima por item é 20 unidades';
  END IF;
  
  -- Verificar se produto está disponível
  IF NOT public.validate_product_availability(NEW.product_id) THEN
    RAISE EXCEPTION 'Produto não está disponível';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Criar trigger para validar limites de pedido
CREATE OR REPLACE FUNCTION public.validate_order_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar valor mínimo e máximo
  IF NEW.total_amount < 15.00 THEN
    RAISE EXCEPTION 'Valor mínimo do pedido é R$ 15,00';
  END IF;
  
  IF NEW.total_amount > 500.00 THEN
    RAISE EXCEPTION 'Valor máximo do pedido é R$ 500,00';
  END IF;
  
  -- Verificar limite de pedidos por hora (5 pedidos)
  IF EXISTS (
    SELECT 1 FROM orders 
    WHERE user_id = NEW.user_id 
    AND created_at > NOW() - INTERVAL '1 hour'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    GROUP BY user_id
    HAVING COUNT(*) >= 5
  ) THEN
    RAISE EXCEPTION 'Limite de 5 pedidos por hora excedido';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Aplicar triggers nas tabelas
DROP TRIGGER IF EXISTS trigger_validate_order_item_quantity ON order_items;
CREATE TRIGGER trigger_validate_order_item_quantity
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_item_quantity();

DROP TRIGGER IF EXISTS trigger_validate_order_limits ON orders;
CREATE TRIGGER trigger_validate_order_limits
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_limits();

-- 5. Função para validar CPF (melhorada)
CREATE OR REPLACE FUNCTION public.validate_cpf_format(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_clean text;
  sum_1 integer := 0;
  sum_2 integer := 0;
  digit_1 integer;
  digit_2 integer;
  i integer;
BEGIN
  -- Limpar CPF (remover caracteres não numéricos)
  cpf_clean := regexp_replace(cpf_input, '[^0-9]', '', 'g');
  
  -- Verificar se tem 11 dígitos
  IF length(cpf_clean) != 11 THEN
    RETURN false;
  END IF;
  
  -- Verificar se não são todos iguais
  IF cpf_clean ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  
  -- Calcular primeiro dígito verificador
  FOR i IN 1..9 LOOP
    sum_1 := sum_1 + (substring(cpf_clean, i, 1)::integer * (11 - i));
  END LOOP;
  
  digit_1 := 11 - (sum_1 % 11);
  IF digit_1 >= 10 THEN
    digit_1 := 0;
  END IF;
  
  -- Verificar primeiro dígito
  IF digit_1 != substring(cpf_clean, 10, 1)::integer THEN
    RETURN false;
  END IF;
  
  -- Calcular segundo dígito verificador
  FOR i IN 1..10 LOOP
    sum_2 := sum_2 + (substring(cpf_clean, i, 1)::integer * (12 - i));
  END LOOP;
  
  digit_2 := 11 - (sum_2 % 11);
  IF digit_2 >= 10 THEN
    digit_2 := 0;
  END IF;
  
  -- Verificar segundo dígito
  IF digit_2 != substring(cpf_clean, 11, 1)::integer THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 6. Criar tabela de logs de segurança
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS para security_logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security logs" 
ON security_logs 
FOR SELECT 
USING (has_role('admin'));

CREATE POLICY "System can insert security logs" 
ON security_logs 
FOR INSERT 
WITH CHECK (true);

-- 7. Função para registrar eventos de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_logs (user_id, action, details, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_details, p_ip_address, p_user_agent);
END;
$$;

-- 8. Criar índices para performance em consultas de segurança
CREATE INDEX IF NOT EXISTS idx_orders_user_created_security 
ON orders(user_id, created_at DESC) 
WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_products_availability_security 
ON products(id, is_available) 
WHERE is_available = true;