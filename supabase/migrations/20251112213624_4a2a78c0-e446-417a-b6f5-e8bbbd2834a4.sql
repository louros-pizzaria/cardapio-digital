-- ===== POLÍTICAS RLS PARA PRODUCT_EXTRAS =====

-- Admins e Attendants podem inserir extras
CREATE POLICY "Admins can insert extras"
  ON product_extras
  FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role(ARRAY['admin', 'attendant']));

-- Admins e Attendants podem atualizar extras (incluindo is_active)
CREATE POLICY "Admins can update extras"
  ON product_extras
  FOR UPDATE
  TO authenticated
  USING (has_any_role(ARRAY['admin', 'attendant']))
  WITH CHECK (has_any_role(ARRAY['admin', 'attendant']));

-- Admins e Attendants podem deletar extras
CREATE POLICY "Admins can delete extras"
  ON product_extras
  FOR DELETE
  TO authenticated
  USING (has_any_role(ARRAY['admin', 'attendant']));

-- ===== POLÍTICAS RLS PARA PRODUCT_CRUSTS =====

-- Admins e Attendants podem inserir bordas
CREATE POLICY "Admins can insert crusts"
  ON product_crusts
  FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role(ARRAY['admin', 'attendant']));

-- Admins e Attendants podem atualizar bordas (incluindo is_active)
CREATE POLICY "Admins can update crusts"
  ON product_crusts
  FOR UPDATE
  TO authenticated
  USING (has_any_role(ARRAY['admin', 'attendant']))
  WITH CHECK (has_any_role(ARRAY['admin', 'attendant']));

-- Admins e Attendants podem deletar bordas
CREATE POLICY "Admins can delete crusts"
  ON product_crusts
  FOR DELETE
  TO authenticated
  USING (has_any_role(ARRAY['admin', 'attendant']));