-- ===== TABELAS DE CONFIGURAÇÕES DO SISTEMA =====

-- Tabela de adicionais de produtos
CREATE TABLE IF NOT EXISTS public.product_extras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de bordas recheadas
CREATE TABLE IF NOT EXISTS public.product_crusts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_extras_active ON public.product_extras(is_active);
CREATE INDEX IF NOT EXISTS idx_product_crusts_active ON public.product_crusts(is_active);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_product_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_extras_timestamp
  BEFORE UPDATE ON public.product_extras
  FOR EACH ROW
  EXECUTE FUNCTION update_product_config_timestamp();

CREATE TRIGGER update_product_crusts_timestamp
  BEFORE UPDATE ON public.product_crusts
  FOR EACH ROW
  EXECUTE FUNCTION update_product_config_timestamp();

-- RLS Policies
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_crusts ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
CREATE POLICY "Admins can manage product extras"
  ON public.product_extras
  FOR ALL
  TO authenticated
  USING (has_role('admin'));

CREATE POLICY "Admins can manage product crusts"
  ON public.product_crusts
  FOR ALL
  TO authenticated
  USING (has_role('admin'));

-- Qualquer um pode ver extras/bordas ativos
CREATE POLICY "Anyone can view active extras"
  ON public.product_extras
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view active crusts"
  ON public.product_crusts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Dados iniciais de exemplo
INSERT INTO public.product_extras (name, price) VALUES
  ('Bacon', 5.00),
  ('Catupiry', 4.00),
  ('Cheddar', 4.00),
  ('Calabresa', 5.00),
  ('Frango', 5.00),
  ('Azeitona', 3.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.product_crusts (name, price) VALUES
  ('Tradicional', 0.00),
  ('Catupiry', 8.00),
  ('Cheddar', 8.00),
  ('Chocolate', 10.00)
ON CONFLICT DO NOTHING;