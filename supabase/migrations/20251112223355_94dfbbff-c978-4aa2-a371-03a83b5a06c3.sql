-- ===== POLÍTICAS RLS PARA DELIVERY_ZONES =====
-- Permitir que admins e attendants gerenciem zonas de entrega

create policy "Admins can insert delivery zones"
  on public.delivery_zones for insert to authenticated
  with check (public.has_any_role(ARRAY['admin', 'attendant']));

create policy "Admins can update delivery zones"
  on public.delivery_zones for update to authenticated
  using (public.has_any_role(ARRAY['admin', 'attendant']))
  with check (public.has_any_role(ARRAY['admin', 'attendant']));

create policy "Admins can delete delivery zones"
  on public.delivery_zones for delete to authenticated
  using (public.has_any_role(ARRAY['admin', 'attendant']));

-- ===== POLÍTICAS RLS PARA DELIVERY_DRIVERS =====
-- Permitir que admins e attendants gerenciem motoboys

create policy "Admins can insert delivery drivers"
  on public.delivery_drivers for insert to authenticated
  with check (public.has_any_role(ARRAY['admin', 'attendant']));

create policy "Admins can update delivery drivers"
  on public.delivery_drivers for update to authenticated
  using (public.has_any_role(ARRAY['admin', 'attendant']))
  with check (public.has_any_role(ARRAY['admin', 'attendant']));

create policy "Admins can delete delivery drivers"
  on public.delivery_drivers for delete to authenticated
  using (public.has_any_role(ARRAY['admin', 'attendant']));

-- ===== POLÍTICAS RLS PARA STORE_SETTINGS =====
-- Permitir que admins e attendants atualizem configurações da loja
-- (INSERT e DELETE não necessários - tabela tem registro único)

create policy "Admins can update store settings"
  on public.store_settings for update to authenticated
  using (public.has_any_role(ARRAY['admin', 'attendant']))
  with check (public.has_any_role(ARRAY['admin', 'attendant']));