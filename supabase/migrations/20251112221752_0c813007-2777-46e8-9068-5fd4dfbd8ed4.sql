-- Habilitar RLS em products (idempotente)
alter table public.products enable row level security;

-- Políticas para products - permitir que admins e atendentes gerenciem produtos
create policy "Admins can update products"
  on public.products for update to authenticated
  using (public.has_any_role(ARRAY['admin','attendant']))
  with check (public.has_any_role(ARRAY['admin','attendant']));

create policy "Admins can insert products"
  on public.products for insert to authenticated
  with check (public.has_any_role(ARRAY['admin','attendant']));

create policy "Admins can delete products"
  on public.products for delete to authenticated
  using (public.has_any_role(ARRAY['admin','attendant']));

-- Políticas SELECT adicionais para product_extras - admins veem todos (ativos e inativos)
create policy "Admins can view all extras"
  on public.product_extras for select to authenticated
  using (public.has_any_role(ARRAY['admin','attendant']));

-- Políticas SELECT adicionais para product_crusts - admins veem todos (ativos e inativos)
create policy "Admins can view all crusts"
  on public.product_crusts for select to authenticated
  using (public.has_any_role(ARRAY['admin','attendant']));