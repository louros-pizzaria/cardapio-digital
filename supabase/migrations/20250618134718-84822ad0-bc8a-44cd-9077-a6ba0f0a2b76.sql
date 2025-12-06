
-- Remover políticas problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Remover todas as políticas existentes para recriá-las de forma segura
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- Recriar apenas as políticas básicas necessárias sem recursão
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Atualizar estrutura de categorias do menu
-- Primeiro, limpar categorias existentes
DELETE FROM public.categories;

-- Inserir novas categorias conforme solicitado
INSERT INTO public.categories (name, description, icon, order_position, is_active) VALUES
('Pizza Grande', 'Pizzas grandes tradicionais', '🍕', 1, true),
('Pizza Broto', 'Pizzas individuais menores', '🍕', 2, true),
('Bebidas', 'Bebidas variadas para acompanhar', '🥤', 3, true);

-- Criar produtos de exemplo para cada categoria
-- Para Pizza Grande
INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position) 
SELECT 
  'Pizza Margherita Grande', 
  'Pizza clássica com molho de tomate, mussarela e manjericão', 
  45.90,
  c.id,
  ARRAY['Massa', 'Molho de tomate', 'Mussarela', 'Manjericão'],
  true,
  1
FROM public.categories c WHERE c.name = 'Pizza Grande';

INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Chocolate com Morango Grande', 
  'Pizza doce com chocolate e morangos frescos', 
  52.90,
  c.id,
  ARRAY['Massa doce', 'Chocolate', 'Morangos', 'Açúcar de confeiteiro'],
  true,
  2
FROM public.categories c WHERE c.name = 'Pizza Grande';

-- Para Pizza Broto
INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Margherita Broto', 
  'Pizza individual com molho de tomate, mussarela e manjericão', 
  25.90,
  c.id,
  ARRAY['Massa', 'Molho de tomate', 'Mussarela', 'Manjericão'],
  true,
  1
FROM public.categories c WHERE c.name = 'Pizza Broto';

INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Nutella Broto', 
  'Pizza doce individual com Nutella', 
  28.90,
  c.id,
  ARRAY['Massa doce', 'Nutella', 'Açúcar de confeiteiro'],
  true,
  2
FROM public.categories c WHERE c.name = 'Pizza Broto';

-- Para Bebidas
INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Suco de Laranja Natural', 
  'Suco natural de laranja 500ml', 
  8.90,
  c.id,
  ARRAY['Laranja natural'],
  true,
  1
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Água Mineral', 
  'Água mineral sem gás 500ml', 
  3.50,
  c.id,
  ARRAY['Água mineral'],
  true,
  2
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Coca-Cola', 
  'Refrigerante Coca-Cola 350ml', 
  5.90,
  c.id,
  ARRAY['Refrigerante'],
  true,
  3
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Cerveja Heineken', 
  'Cerveja Heineken long neck 330ml', 
  8.50,
  c.id,
  ARRAY['Cerveja'],
  true,
  4
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.products (name, description, price, category_id, ingredients, is_available, order_position)
SELECT 
  'Vinho Tinto', 
  'Vinho tinto seco nacional 750ml', 
  45.00,
  c.id,
  ARRAY['Vinho tinto'],
  true,
  5
FROM public.categories c WHERE c.name = 'Bebidas';
