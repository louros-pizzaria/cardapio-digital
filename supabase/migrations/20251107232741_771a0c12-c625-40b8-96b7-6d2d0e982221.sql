-- Adicionar colunas de horários e pagamentos à store_settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS auto_schedule BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS schedules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS additional_schedule_info TEXT,
ADD COLUMN IF NOT EXISTS online_payment_config JSONB DEFAULT '{
  "pix": true,
  "creditCard": true,
  "creditFee": 0,
  "debitCard": true,
  "debitFee": 0
}'::jsonb,
ADD COLUMN IF NOT EXISTS in_person_payment_config JSONB DEFAULT '{
  "cash": true,
  "changeFor": 0,
  "deliveryFee": 5,
  "freeDeliveryAbove": 50
}'::jsonb,
ADD COLUMN IF NOT EXISTS general_payment_config JSONB DEFAULT '{
  "minOrder": 15,
  "maxOrder": 500,
  "autoDiscount": false,
  "discountThreshold": 100,
  "discountPercent": 10,
  "allowCoupons": true,
  "requireLogin": false
}'::jsonb;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_store_settings_schedules 
ON store_settings USING GIN (schedules);

-- Inserir horários padrão onde não existirem
UPDATE store_settings 
SET schedules = '[
  {"dayId": 0, "dayName": "Domingo", "isOpen": false, "periods": [{"start": "00:00", "end": "01:00"}]},
  {"dayId": 1, "dayName": "Segunda-feira", "isOpen": true, "periods": [{"start": "11:00", "end": "14:00"}, {"start": "18:00", "end": "23:00"}]},
  {"dayId": 2, "dayName": "Terça-feira", "isOpen": true, "periods": [{"start": "11:00", "end": "14:00"}, {"start": "18:00", "end": "23:00"}]},
  {"dayId": 3, "dayName": "Quarta-feira", "isOpen": true, "periods": [{"start": "11:00", "end": "14:00"}, {"start": "18:00", "end": "23:00"}]},
  {"dayId": 4, "dayName": "Quinta-feira", "isOpen": true, "periods": [{"start": "11:00", "end": "14:00"}, {"start": "18:00", "end": "23:00"}]},
  {"dayId": 5, "dayName": "Sexta-feira", "isOpen": true, "periods": [{"start": "11:00", "end": "14:00"}, {"start": "18:00", "end": "23:00"}]},
  {"dayId": 6, "dayName": "Sábado", "isOpen": true, "periods": [{"start": "11:00", "end": "23:00"}]}
]'::jsonb
WHERE schedules IS NULL OR schedules = '[]'::jsonb;

-- RLS Policies
CREATE POLICY "Anyone can view store settings"
  ON store_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update store settings"
  ON store_settings FOR UPDATE
  USING (has_role('admin'));