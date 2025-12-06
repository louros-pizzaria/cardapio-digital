-- ===== TABELA DE CONFIGURAÇÕES DA LOJA =====

CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_open boolean NOT NULL DEFAULT true,
  auto_accept_orders boolean NOT NULL DEFAULT false,
  min_order_value numeric NOT NULL DEFAULT 15.00,
  max_order_value numeric NOT NULL DEFAULT 500.00,
  estimated_prep_time integer NOT NULL DEFAULT 45,
  closed_message text DEFAULT 'Estamos fechados no momento. Volte em breve!',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Garantir que só existe uma linha de configuração
CREATE UNIQUE INDEX IF NOT EXISTS store_settings_singleton ON public.store_settings ((true));

-- Inserir configuração padrão
INSERT INTO public.store_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode visualizar configurações da loja"
ON public.store_settings FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem atualizar configurações"
ON public.store_settings FOR UPDATE
USING (public.has_role('admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== TABELA DE PAUSAS DE PRODUTOS =====

CREATE TABLE IF NOT EXISTS public.product_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  paused_by uuid REFERENCES auth.users(id),
  reason text,
  paused_at timestamp with time zone NOT NULL DEFAULT now(),
  resume_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS Policies para pausas de produtos
ALTER TABLE public.product_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode visualizar pausas"
ON public.product_pauses FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem gerenciar pausas"
ON public.product_pauses FOR ALL
USING (public.has_role('admin'));