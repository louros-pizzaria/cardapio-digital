-- Criar webhook para capturar eventos de segurança em tempo real
CREATE OR REPLACE FUNCTION public.notify_security_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar sobre eventos críticos de segurança
  IF NEW.action IN ('multiple_failed_logins', 'suspicious_order_pattern', 'rate_limit_exceeded') THEN
    PERFORM pg_notify('security_alert', json_build_object(
      'event', NEW.action,
      'user_id', NEW.user_id,
      'details', NEW.details,
      'timestamp', NEW.created_at
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para notificações automáticas
CREATE TRIGGER security_event_notification
  AFTER INSERT ON security_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_security_event();

-- Função para validar força da senha  
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_input text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  score integer := 0;
  issues text[] := '{}';
BEGIN
  -- Verificar comprimento mínimo
  IF length(password_input) < 8 THEN
    issues := array_append(issues, 'Mínimo 8 caracteres');
  ELSE
    score := score + 1;
  END IF;
  
  -- Verificar se tem letras maiúsculas
  IF password_input !~ '[A-Z]' THEN
    issues := array_append(issues, 'Pelo menos 1 letra maiúscula');
  ELSE
    score := score + 1;
  END IF;
  
  -- Verificar se tem letras minúsculas
  IF password_input !~ '[a-z]' THEN
    issues := array_append(issues, 'Pelo menos 1 letra minúscula');
  ELSE
    score := score + 1;
  END IF;
  
  -- Verificar se tem números
  IF password_input !~ '[0-9]' THEN
    issues := array_append(issues, 'Pelo menos 1 número');
  ELSE
    score := score + 1;
  END IF;
  
  -- Verificar se tem caracteres especiais
  IF password_input !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    issues := array_append(issues, 'Pelo menos 1 caractere especial');
  ELSE
    score := score + 1;
  END IF;
  
  -- Verificar senhas comuns
  IF password_input IN ('123456', 'password', '123456789', 'qwerty', 'abc123', 'password123') THEN
    issues := array_append(issues, 'Senha muito comum');
    score := score - 2;
  END IF;
  
  result := json_build_object(
    'score', GREATEST(score, 0),
    'max_score', 5,
    'strength', CASE 
      WHEN score >= 5 THEN 'forte'
      WHEN score >= 3 THEN 'média'
      ELSE 'fraca'
    END,
    'valid', array_length(issues, 1) IS NULL,
    'issues', issues
  );
  
  RETURN result;
END;
$function$;