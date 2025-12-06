-- Adicionar campos de endereço completo à tabela store_info
ALTER TABLE store_info 
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Atualizar com dados da loja
UPDATE store_info SET
  city = 'Paraty',
  state = 'RJ',
  zip_code = '23970-000',
  neighborhood = 'Centro'
WHERE id = '248ed3cb-c460-4b0b-b8c3-c8a89a734f5d';