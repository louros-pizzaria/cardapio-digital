-- Criar tabela para transações de cartão
CREATE TABLE public.card_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  mercadopago_payment_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  payment_method_id TEXT,
  installments INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own card transactions"
  ON public.card_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert card transactions"
  ON public.card_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update card transactions"
  ON public.card_transactions
  FOR UPDATE
  USING (true);

-- Índices para performance
CREATE INDEX idx_card_transactions_user_id ON public.card_transactions(user_id);
CREATE INDEX idx_card_transactions_order_id ON public.card_transactions(order_id);
CREATE INDEX idx_card_transactions_mercadopago_id ON public.card_transactions(mercadopago_payment_id);
CREATE INDEX idx_card_transactions_status ON public.card_transactions(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_card_transactions_updated_at
  BEFORE UPDATE ON public.card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();