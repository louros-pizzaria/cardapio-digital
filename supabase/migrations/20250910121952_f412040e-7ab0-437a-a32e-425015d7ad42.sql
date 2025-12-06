-- Sistema de Integrações Externas

-- Tabela para gerenciar integrações de entrega
CREATE TABLE public.delivery_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'ifood', 'uber_eats', 'rappi', etc
  store_id TEXT, -- ID da loja na plataforma externa
  api_key TEXT, -- Chave da API (criptografada)
  webhook_url TEXT, -- URL do webhook para receber pedidos
  is_active BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}', -- Configurações específicas da plataforma
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para logs de webhook
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT, -- Assinatura do webhook para validação
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'rejected'
  error_message TEXT,
  order_id UUID REFERENCES public.orders(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para pedidos externos (unificação)
CREATE TABLE public.external_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL, -- ID do pedido na plataforma externa
  internal_order_id UUID REFERENCES public.orders(id),
  customer_data JSONB, -- Dados do cliente da plataforma externa
  items JSONB NOT NULL, -- Itens do pedido
  total_amount NUMERIC NOT NULL,
  delivery_fee NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  status TEXT NOT NULL,
  external_status TEXT, -- Status original da plataforma
  delivery_address JSONB,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(platform, external_id)
);

-- Tabela para reconciliação de pagamentos
CREATE TABLE public.payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method TEXT NOT NULL, -- 'mercadopago', 'stripe', 'pix', etc
  external_transaction_id TEXT NOT NULL,
  internal_transaction_id TEXT,
  order_id UUID REFERENCES public.orders(id),
  expected_amount NUMERIC NOT NULL,
  received_amount NUMERIC,
  fee_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'matched', 'discrepancy', 'missing'
  reconciled_at TIMESTAMP WITH TIME ZONE,
  discrepancy_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para relatórios fiscais
CREATE TABLE public.fiscal_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'daily', 'monthly', 'nfce', 'sat'
  reference_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'generated', 'sent', 'error'
  file_path TEXT, -- Caminho do arquivo gerado
  total_sales NUMERIC DEFAULT 0,
  total_taxes NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  external_reference TEXT, -- Referência no sistema fiscal externo
  generated_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para configurações de ERP
CREATE TABLE public.erp_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_system TEXT NOT NULL, -- 'bling', 'omie', 'tiny', 'sap', etc
  api_endpoint TEXT,
  api_key TEXT, -- Criptografado
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'hourly', -- 'real_time', 'hourly', 'daily'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para logs de sincronização ERP
CREATE TABLE public.erp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_system TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'products', 'orders', 'customers', 'inventory'
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_error INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_webhook_logs_platform_status ON public.webhook_logs(platform, status);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX idx_external_orders_platform_status ON public.external_orders(platform, status);
CREATE INDEX idx_external_orders_created_at ON public.external_orders(created_at);
CREATE INDEX idx_payment_reconciliation_status ON public.payment_reconciliation(status);
CREATE INDEX idx_fiscal_reports_date_type ON public.fiscal_reports(reference_date, report_type);

-- RLS Policies
ALTER TABLE public.delivery_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para admins
CREATE POLICY "Admins can manage delivery integrations" ON public.delivery_integrations
  FOR ALL USING (has_role('admin'));

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
  FOR SELECT USING (has_role('admin'));

CREATE POLICY "System can manage webhook logs" ON public.webhook_logs
  FOR ALL USING (true);

CREATE POLICY "Admins can manage external orders" ON public.external_orders
  FOR ALL USING (has_role('admin'));

CREATE POLICY "Attendants can view external orders" ON public.external_orders
  FOR SELECT USING (has_any_role(ARRAY['admin', 'attendant']));

CREATE POLICY "Admins can manage payment reconciliation" ON public.payment_reconciliation
  FOR ALL USING (has_role('admin'));

CREATE POLICY "Admins can manage fiscal reports" ON public.fiscal_reports
  FOR ALL USING (has_role('admin'));

CREATE POLICY "Admins can manage ERP configurations" ON public.erp_configurations
  FOR ALL USING (has_role('admin'));

CREATE POLICY "Admins can view ERP sync logs" ON public.erp_sync_logs
  FOR SELECT USING (has_role('admin'));

CREATE POLICY "System can manage ERP sync logs" ON public.erp_sync_logs
  FOR ALL USING (true);

-- Funções auxiliares para integrações
CREATE OR REPLACE FUNCTION public.process_external_order(
  p_platform TEXT,
  p_external_id TEXT,
  p_order_data JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_external_order_id UUID;
BEGIN
  -- Verificar se o pedido externo já existe
  SELECT id INTO v_external_order_id
  FROM public.external_orders
  WHERE platform = p_platform AND external_id = p_external_id;
  
  IF v_external_order_id IS NOT NULL THEN
    RETURN v_external_order_id;
  END IF;
  
  -- Criar pedido interno
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    total_amount,
    delivery_fee,
    payment_method,
    status,
    notes
  ) VALUES (
    p_order_data->>'customer_name',
    p_order_data->>'customer_phone',
    (p_order_data->>'total_amount')::numeric,
    (p_order_data->>'delivery_fee')::numeric,
    'external',
    'pending',
    'Pedido externo - ' || p_platform
  ) RETURNING id INTO v_order_id;
  
  -- Criar registro de pedido externo
  INSERT INTO public.external_orders (
    platform,
    external_id,
    internal_order_id,
    customer_data,
    items,
    total_amount,
    delivery_fee,
    status,
    delivery_address
  ) VALUES (
    p_platform,
    p_external_id,
    v_order_id,
    p_order_data->'customer',
    p_order_data->'items',
    (p_order_data->>'total_amount')::numeric,
    (p_order_data->>'delivery_fee')::numeric,
    p_order_data->>'status',
    p_order_data->'delivery_address'
  ) RETURNING id INTO v_external_order_id;
  
  RETURN v_external_order_id;
END;
$$;

-- Função para reconciliação automática de pagamentos
CREATE OR REPLACE FUNCTION public.auto_reconcile_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reconciled_count INTEGER := 0;
  v_reconciliation RECORD;
BEGIN
  -- Buscar reconciliações pendentes
  FOR v_reconciliation IN
    SELECT *
    FROM public.payment_reconciliation
    WHERE status = 'pending'
    AND created_at > now() - INTERVAL '30 days'
  LOOP
    -- Tentar fazer match com transações
    IF v_reconciliation.expected_amount = v_reconciliation.received_amount THEN
      UPDATE public.payment_reconciliation
      SET 
        status = 'matched',
        reconciled_at = now()
      WHERE id = v_reconciliation.id;
      
      v_reconciled_count := v_reconciled_count + 1;
    ELSIF v_reconciliation.received_amount IS NOT NULL THEN
      UPDATE public.payment_reconciliation
      SET 
        status = 'discrepancy',
        discrepancy_reason = 'Amount mismatch: expected ' || v_reconciliation.expected_amount || ', received ' || v_reconciliation.received_amount
      WHERE id = v_reconciliation.id;
    END IF;
  END LOOP;
  
  RETURN v_reconciled_count;
END;
$$;