-- Permitir que atendentes e admins visualizem itens de pedidos no painel
-- Sem alterar permissões de criação/edição dos clientes

-- Cria a política apenas se ela ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'Attendants can view order items'
  ) THEN
    CREATE POLICY "Attendants can view order items"
    ON public.order_items
    FOR SELECT
    USING (
      has_any_role(ARRAY['admin'::text, 'attendant'::text])
    );
  END IF;
END $$;

-- Opcional: confirmar que RLS está habilitado (não altera se já estiver)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;