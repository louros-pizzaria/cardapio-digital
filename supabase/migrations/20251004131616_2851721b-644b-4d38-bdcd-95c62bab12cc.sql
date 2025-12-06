-- ===== TABELA DE MENSAGENS DOS PEDIDOS =====
CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'attendant', 'system')),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document')),
  media_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON public.order_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_messages_unread ON public.order_messages(is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view messages from their orders"
ON public.order_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_messages.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Attendants can view all messages"
ON public.order_messages
FOR SELECT
USING (has_any_role(ARRAY['admin', 'attendant']));

CREATE POLICY "Users can send messages to their orders"
ON public.order_messages
FOR INSERT
WITH CHECK (
  sender_type = 'customer'
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_messages.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Attendants can send messages to any order"
ON public.order_messages
FOR INSERT
WITH CHECK (
  sender_type = 'attendant'
  AND has_any_role(ARRAY['admin', 'attendant'])
);

CREATE POLICY "System can insert system messages"
ON public.order_messages
FOR INSERT
WITH CHECK (sender_type = 'system');

CREATE POLICY "Attendants can mark messages as read"
ON public.order_messages
FOR UPDATE
USING (has_any_role(ARRAY['admin', 'attendant']))
WITH CHECK (has_any_role(ARRAY['admin', 'attendant']));

CREATE POLICY "Users can mark their messages as read"
ON public.order_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_messages.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_order_messages_updated_at
BEFORE UPDATE ON public.order_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;