-- Criar tabela de entregadores/motoboys
CREATE TABLE public.delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  motorcycle_model TEXT NOT NULL,
  license_plate TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem gerenciar tudo
CREATE POLICY "Admins can manage delivery drivers"
  ON public.delivery_drivers
  FOR ALL
  USING (has_role('admin'));

-- Política: Attendants podem visualizar
CREATE POLICY "Attendants can view delivery drivers"
  ON public.delivery_drivers
  FOR SELECT
  USING (has_any_role(ARRAY['admin', 'attendant']));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_delivery_drivers_updated_at
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_delivery_drivers_is_active ON public.delivery_drivers(is_active);
CREATE INDEX idx_delivery_drivers_license_plate ON public.delivery_drivers(license_plate);

-- Criar bucket de storage para fotos dos motoboys
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-drivers', 'delivery-drivers', true);

-- Políticas de storage: Admins podem fazer upload
CREATE POLICY "Admins can upload driver photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'delivery-drivers' 
    AND has_role('admin')
  );

CREATE POLICY "Admins can update driver photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'delivery-drivers' AND has_role('admin'));

CREATE POLICY "Admins can delete driver photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'delivery-drivers' AND has_role('admin'));

-- Qualquer um pode visualizar fotos públicas
CREATE POLICY "Anyone can view driver photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-drivers');

-- Comentários
COMMENT ON TABLE public.delivery_drivers IS 'Cadastro de motoboys/entregadores da pizzaria';
COMMENT ON COLUMN public.delivery_drivers.license_plate IS 'Placa da moto no formato brasileiro (AAA-1234 ou AAA1B23)';