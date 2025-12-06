-- Corrigir problemas de segurança do linter

-- Corrigir search_path das funções existentes que não têm
CREATE OR REPLACE FUNCTION public.validate_product_availability(product_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM products 
    WHERE id = product_id 
    AND is_available = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_item_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_cpf_format(cpf_input text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;