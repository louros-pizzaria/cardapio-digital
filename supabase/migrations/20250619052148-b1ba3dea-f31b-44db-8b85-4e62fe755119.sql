
-- Primeiro, vamos limpar as categorias existentes e criar a nova estrutura
DELETE FROM public.products;
DELETE FROM public.categories;

-- Inserir as categorias principais
INSERT INTO public.categories (name, description, icon, order_position, is_active) VALUES
('Pizzas Grandes', 'Pizzas grandes tradicionais', '🍕', 1, true),
('Pizzas Broto', 'Pizzas individuais menores', '🍕', 2, true),
('Bebidas', 'Bebidas variadas para acompanhar', '🥤', 3, true);

-- Agora vamos criar uma tabela para subcategorias
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) NOT NULL,
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir subcategorias para Pizzas Grandes
INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Salgadas', 'Pizzas salgadas grandes', c.id, 1
FROM public.categories c WHERE c.name = 'Pizzas Grandes';

INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Doces', 'Pizzas doces grandes', c.id, 2
FROM public.categories c WHERE c.name = 'Pizzas Grandes';

-- Inserir subcategorias para Pizzas Broto
INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Salgadas', 'Pizzas salgadas broto', c.id, 1
FROM public.categories c WHERE c.name = 'Pizzas Broto';

INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Doces', 'Pizzas doces broto', c.id, 2
FROM public.categories c WHERE c.name = 'Pizzas Broto';

-- Inserir subcategorias para Bebidas
INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Águas', 'Águas minerais e com gás', c.id, 1
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Vinhos', 'Vinhos tintos, brancos e rosés', c.id, 2
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Cervejas', 'Cervejas nacionais e importadas', c.id, 3
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Refrigerantes', 'Refrigerantes diversos', c.id, 4
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.subcategories (name, description, category_id, order_position) 
SELECT 'Sucos', 'Sucos naturais e industrializados', c.id, 5
FROM public.categories c WHERE c.name = 'Bebidas';

-- Adicionar coluna subcategory_id na tabela products
ALTER TABLE public.products ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id);

-- Criar alguns produtos de exemplo para cada subcategoria
-- Pizzas Grandes Salgadas
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Margherita Grande', 
  'Pizza clássica com molho de tomate, mussarela e manjericão', 
  45.90,
  c.id,
  s.id,
  ARRAY['Massa', 'Molho de tomate', 'Mussarela', 'Manjericão'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Pizzas Grandes' AND s.name = 'Salgadas';

INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Pepperoni Grande', 
  'Pizza com molho de tomate, mussarela e pepperoni', 
  52.90,
  c.id,
  s.id,
  ARRAY['Massa', 'Molho de tomate', 'Mussarela', 'Pepperoni'],
  true,
  2
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Pizzas Grandes' AND s.name = 'Salgadas';

-- Pizzas Grandes Doces
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Chocolate com Morango Grande', 
  'Pizza doce com chocolate e morangos frescos', 
  48.90,
  c.id,
  s.id,
  ARRAY['Massa doce', 'Chocolate', 'Morangos', 'Açúcar de confeiteiro'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Pizzas Grandes' AND s.name = 'Doces';

-- Pizzas Broto Salgadas
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Margherita Broto', 
  'Pizza individual com molho de tomate, mussarela e manjericão', 
  25.90,
  c.id,
  s.id,
  ARRAY['Massa', 'Molho de tomate', 'Mussarela', 'Manjericão'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Pizzas Broto' AND s.name = 'Salgadas';

-- Pizzas Broto Doces
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Pizza Nutella Broto', 
  'Pizza doce individual com Nutella', 
  28.90,
  c.id,
  s.id,
  ARRAY['Massa doce', 'Nutella', 'Açúcar de confeiteiro'],
  true,
  2
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Pizzas Broto' AND s.name = 'Doces';

-- Bebidas - Águas
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Água Mineral 500ml', 
  'Água mineral sem gás', 
  3.50,
  c.id,
  s.id,
  ARRAY['Água mineral'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Bebidas' AND s.name = 'Águas';

-- Bebidas - Cervejas
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Cerveja Heineken 330ml', 
  'Cerveja Heineken long neck', 
  8.50,
  c.id,
  s.id,
  ARRAY['Cerveja'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Bebidas' AND s.name = 'Cervejas';

-- Bebidas - Refrigerantes
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Coca-Cola 350ml', 
  'Refrigerante Coca-Cola lata', 
  5.90,
  c.id,
  s.id,
  ARRAY['Refrigerante'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Bebidas' AND s.name = 'Refrigerantes';

-- Bebidas - Sucos
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Suco de Laranja Natural 500ml', 
  'Suco natural de laranja', 
  8.90,
  c.id,
  s.id,
  ARRAY['Laranja natural'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Bebidas' AND s.name = 'Sucos';

-- Bebidas - Vinhos
INSERT INTO public.products (name, description, price, category_id, subcategory_id, ingredients, is_available, order_position)
SELECT 
  'Vinho Tinto Seco 750ml', 
  'Vinho tinto seco nacional', 
  45.00,
  c.id,
  s.id,
  ARRAY['Vinho tinto'],
  true,
  1
FROM public.categories c 
JOIN public.subcategories s ON c.id = s.category_id
WHERE c.name = 'Bebidas' AND s.name = 'Vinhos';
