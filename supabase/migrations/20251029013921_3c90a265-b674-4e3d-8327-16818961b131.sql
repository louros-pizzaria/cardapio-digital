-- Adicionar coluna updated_at na tabela stock_reservations
ALTER TABLE stock_reservations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_stock_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_reservations_updated_at
  BEFORE UPDATE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_reservations_updated_at();