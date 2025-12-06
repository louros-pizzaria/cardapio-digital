-- Atualizar o enum de roles para incluir atendente
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'attendant';

-- Criar tabela de configurações do sistema
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para configurações do sistema
CREATE POLICY "Admins can manage all settings" 
ON public.system_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Attendants can view settings" 
ON public.system_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'attendant')
));

-- Inserir configurações padrão
INSERT INTO public.system_settings (key, value, description, category) VALUES
('delivery_fee', '{"default": 5.00, "free_above": 50.00}', 'Taxa de entrega padrão e valor mínimo para entrega gratuita', 'delivery'),
('opening_hours', '{"monday": {"open": "18:00", "close": "23:00"}, "tuesday": {"open": "18:00", "close": "23:00"}, "wednesday": {"open": "18:00", "close": "23:00"}, "thursday": {"open": "18:00", "close": "23:00"}, "friday": {"open": "18:00", "close": "00:00"}, "saturday": {"open": "18:00", "close": "00:00"}, "sunday": {"open": "18:00", "close": "23:00"}}', 'Horários de funcionamento por dia da semana', 'general'),
('max_delivery_distance', '{"distance": 10, "unit": "km"}', 'Distância máxima para entrega', 'delivery'),
('estimated_prep_time', '{"default": 45, "busy_hours": 60}', 'Tempo estimado de preparo em minutos', 'general');

-- Criar tabela de cupons de desconto
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Políticas para cupons
CREATE POLICY "Admins can manage all coupons" 
ON public.coupons 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Attendants can view coupons" 
ON public.coupons 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'attendant')
));

CREATE POLICY "Anyone can view active coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true AND valid_from <= now() AND valid_until >= now());

-- Criar tabela de estoque de bebidas
CREATE TABLE public.beverages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'beverage',
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 10,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beverages ENABLE ROW LEVEL SECURITY;

-- Políticas para bebidas
CREATE POLICY "Anyone can view available beverages" 
ON public.beverages 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Admins can manage all beverages" 
ON public.beverages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Attendants can update beverage stock" 
ON public.beverages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'attendant')
));

-- Inserir algumas bebidas padrão
INSERT INTO public.beverages (name, price, stock_quantity) VALUES
('Coca-Cola Lata 350ml', 4.50, 50),
('Guaraná Antarctica Lata 350ml', 4.50, 50),
('Água Mineral 500ml', 3.00, 30),
('Suco de Laranja 300ml', 5.00, 25),
('Cerveja Skol Lata 350ml', 4.00, 40);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at 
    BEFORE UPDATE ON public.coupons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beverages_updated_at 
    BEFORE UPDATE ON public.beverages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();