-- Primeiro, limpar as tabelas que referenciam produtos
DELETE FROM order_items;

-- Agora podemos limpar os produtos
DELETE FROM products;

-- Apagar todas as subcategorias existentes
DELETE FROM subcategories;

-- Apagar todas as categorias existentes
DELETE FROM categories;

-- Criar categorias principais
INSERT INTO categories (id, name, description, icon, order_position, is_active) VALUES
(gen_random_uuid(), 'Pizzas Grandes', 'Pizzas tamanho grande', '🍕', 1, true),
(gen_random_uuid(), 'Pizzas Broto', 'Pizzas tamanho broto', '🍕', 2, true),
(gen_random_uuid(), 'Águas', 'Águas minerais', '💧', 3, true),
(gen_random_uuid(), 'Cervejas', 'Cervejas geladas', '🍺', 4, true),
(gen_random_uuid(), 'Sucos', 'Sucos naturais', '🧃', 5, true),
(gen_random_uuid(), 'Refrigerantes', 'Refrigerantes diversos', '🥤', 6, true);

-- Criar subcategorias
WITH category_ids AS (
  SELECT id, name FROM categories
)
INSERT INTO subcategories (id, name, description, category_id, order_position, is_active) VALUES
-- Pizzas Grandes
(gen_random_uuid(), 'Salgadas', 'Pizzas grandes salgadas', (SELECT id FROM category_ids WHERE name = 'Pizzas Grandes'), 1, true),
(gen_random_uuid(), 'Doces', 'Pizzas grandes doces', (SELECT id FROM category_ids WHERE name = 'Pizzas Grandes'), 2, true),
-- Pizzas Broto
(gen_random_uuid(), 'Salgadas', 'Pizzas broto salgadas', (SELECT id FROM category_ids WHERE name = 'Pizzas Broto'), 1, true),
(gen_random_uuid(), 'Doces', 'Pizzas broto doces', (SELECT id FROM category_ids WHERE name = 'Pizzas Broto'), 2, true);

-- Inserir produtos - Pizzas Grandes Salgadas
WITH subcategory_id AS (
  SELECT s.id FROM subcategories s
  JOIN categories c ON s.category_id = c.id
  WHERE c.name = 'Pizzas Grandes' AND s.name = 'Salgadas'
)
INSERT INTO products (name, description, price, ingredients, subcategory_id, is_available, order_position) VALUES
('A Moda do Rei', 'Pizza especial da casa', 84.90, ARRAY['Mussarela', 'calabresa moída', 'palmito', 'catupiry', 'cebola', 'manjericão', 'azeitonas fatiadas'], (SELECT id FROM subcategory_id), true, 1),
('Aliche', 'Com filé de aliche', 79.90, ARRAY['Filé de aliche', 'mussarela', 'tomate picado'], (SELECT id FROM subcategory_id), true, 2),
('Atum', 'Pizza de atum', 79.90, ARRAY['Mussarela', 'atum', 'cebola'], (SELECT id FROM subcategory_id), true, 3),
('Bacon', 'Pizza com bacon', 79.90, ARRAY['Mussarela', 'bacon'], (SELECT id FROM subcategory_id), true, 4),
('Baiana', 'Pizza picante', 79.90, ARRAY['Calabresa moída', 'ovos', 'cebola', 'pimenta calabresa'], (SELECT id FROM subcategory_id), true, 5),
('Bauru', 'Pizza bauru', 79.90, ARRAY['Mussarela', 'presunto', 'tomate picado'], (SELECT id FROM subcategory_id), true, 6),
('Brócolis 1', 'Brócolis com bacon', 79.90, ARRAY['Brócolis', 'bacon', 'catupiry'], (SELECT id FROM subcategory_id), true, 7),
('Brócolis 2', 'Brócolis com peru', 79.90, ARRAY['Brócolis', 'peito de peru', 'mussarela'], (SELECT id FROM subcategory_id), true, 8),
('Brócolis 3', 'Brócolis com bacon e mussarela', 79.90, ARRAY['Brócolis', 'bacon', 'mussarela'], (SELECT id FROM subcategory_id), true, 9),
('Caipira', 'Pizza caipira', 82.90, ARRAY['Frango desfiado', 'milho', 'catupiry'], (SELECT id FROM subcategory_id), true, 10),
('Calabresa 1', 'Calabresa tradicional', 79.90, ARRAY['Calabresa fatiada', 'cebola', 'parmesão'], (SELECT id FROM subcategory_id), true, 11),
('Calabresa 2', 'Calabresa com mussarela', 79.90, ARRAY['Calabresa fatiada', 'mussarela', 'parmesão'], (SELECT id FROM subcategory_id), true, 12),
('Calabresa 3', 'Calabresa com catupiry', 79.90, ARRAY['Calabresa fatiada', 'catupiry'], (SELECT id FROM subcategory_id), true, 13),
('Calabresa 4', 'Calabresa completa', 79.90, ARRAY['Calabresa fatiada', 'cebola', 'mussarela'], (SELECT id FROM subcategory_id), true, 14),
('Carne seca', 'Pizza de carne seca', 84.90, ARRAY['Mussarela', 'carne seca', 'catupiry'], (SELECT id FROM subcategory_id), true, 15),
('Costela bovina', 'Pizza de costela', 84.90, ARRAY['Mussarela', 'costela bovina desfiada', 'cebola', 'pimentão'], (SELECT id FROM subcategory_id), true, 16),
('Dois queijos', 'Pizza dois queijos', 79.90, ARRAY['Mussarela', 'catupiry'], (SELECT id FROM subcategory_id), true, 17),
('Doritos', 'Pizza com doritos', 84.90, ARRAY['Mussarela', 'bacon', 'cheddar', 'doritos'], (SELECT id FROM subcategory_id), true, 18),
('Frango catupiry', 'Frango com catupiry', 82.90, ARRAY['Frango desfiado', 'catupiry'], (SELECT id FROM subcategory_id), true, 19),
('Frango com bacon', 'Frango com bacon', 82.90, ARRAY['Frango desfiado', 'bacon', 'catupiry'], (SELECT id FROM subcategory_id), true, 20),
('Frango com cheddar', 'Frango com cheddar', 82.90, ARRAY['Frango desfiado', 'cheddar'], (SELECT id FROM subcategory_id), true, 21),
('Frango com mussarela', 'Frango com mussarela', 82.90, ARRAY['Frango desfiado', 'mussarela'], (SELECT id FROM subcategory_id), true, 22),
('Marguerita', 'Pizza marguerita', 79.90, ARRAY['Mussarela', 'tomate', 'manjericão'], (SELECT id FROM subcategory_id), true, 23),
('Milho', 'Pizza de milho', 79.90, ARRAY['Mussarela', 'milho'], (SELECT id FROM subcategory_id), true, 24),
('Mussarela', 'Pizza de mussarela', 79.90, ARRAY['Mussarela', 'molho artesanal da casa'], (SELECT id FROM subcategory_id), true, 25),
('Palmito', 'Pizza de palmito', 79.90, ARRAY['Mussarela', 'palmito', 'azeitona fatiada'], (SELECT id FROM subcategory_id), true, 26),
('Parma', 'Pizza com presunto parma', 84.90, ARRAY['Mussarela', 'presunto parma', 'rúcula'], (SELECT id FROM subcategory_id), true, 27),
('Peito de peru', 'Pizza de peito de peru', 79.90, ARRAY['Mussarela', 'peito de peru'], (SELECT id FROM subcategory_id), true, 28),
('Pepperoni', 'Pizza de pepperoni', 82.90, ARRAY['Mussarela', 'pepperoni'], (SELECT id FROM subcategory_id), true, 29),
('Portuguesa', 'Pizza portuguesa', 82.90, ARRAY['Mussarela', 'presunto', 'milho', 'ovos', 'cebola'], (SELECT id FROM subcategory_id), true, 30),
('Quatro queijos', 'Pizza quatro queijos', 82.90, ARRAY['Mussarela', 'gorgonzola', 'parmesão', 'catupiry'], (SELECT id FROM subcategory_id), true, 31),
('Rúcula', 'Pizza de rúcula', 79.90, ARRAY['Mussarela', 'rúcula'], (SELECT id FROM subcategory_id), true, 32),
('Siciliana', 'Pizza siciliana', 79.90, ARRAY['Mussarela', 'champignon', 'bacon'], (SELECT id FROM subcategory_id), true, 33),
('Strogonoff de frango', 'Pizza strogonoff', 82.90, ARRAY['Mussarela', 'strogonoff de frango', 'batata palha'], (SELECT id FROM subcategory_id), true, 34),
('Três queijos', 'Pizza três queijos', 79.90, ARRAY['Mussarela', 'gorgonzola', 'catupiry'], (SELECT id FROM subcategory_id), true, 35),
('Vegetariana', 'Pizza vegetariana', 79.90, ARRAY['Mussarela', 'palmito', 'champignon'], (SELECT id FROM subcategory_id), true, 36),
('Zucchini', 'Pizza de abobrinha', 79.90, ARRAY['Mussarela', 'abobrinha', 'catupiry', 'tomate picado'], (SELECT id FROM subcategory_id), true, 37);

-- Inserir produtos - Pizzas Grandes Doces
WITH subcategory_id AS (
  SELECT s.id FROM subcategories s
  JOIN categories c ON s.category_id = c.id
  WHERE c.name = 'Pizzas Grandes' AND s.name = 'Doces'
)
INSERT INTO products (name, description, price, ingredients, subcategory_id, is_available, order_position) VALUES
('Abacaxi', 'Pizza doce de abacaxi', 79.90, ARRAY['Creme de leite', 'abacaxi', 'chocolate branco', 'coco ralado'], (SELECT id FROM subcategory_id), true, 1),
('Abacaxi 2', 'Pizza doce de abacaxi com canela', 79.90, ARRAY['Creme de leite', 'abacaxi', 'canela', 'açúcar'], (SELECT id FROM subcategory_id), true, 2),
('Brigadeiro', 'Pizza de brigadeiro', 79.90, ARRAY['Creme de leite', 'chocolate', 'granulado'], (SELECT id FROM subcategory_id), true, 3),
('Chocolate', 'Pizza de chocolate', 79.90, ARRAY['Creme de leite', 'chocolate'], (SELECT id FROM subcategory_id), true, 4),
('Confetes', 'Pizza com confetes', 79.90, ARRAY['Creme de leite', 'chocolate', 'confetes'], (SELECT id FROM subcategory_id), true, 5),
('Ninho', 'Pizza de ninho', 79.90, ARRAY['Creme de leite', 'chocolate', 'ninho'], (SELECT id FROM subcategory_id), true, 6),
('Ninho com coco', 'Pizza de ninho com coco', 79.90, ARRAY['Creme de leite', 'chocolate', 'ninho', 'coco ralado'], (SELECT id FROM subcategory_id), true, 7),
('Ninho com morango', 'Pizza de ninho com morango', 79.90, ARRAY['Creme de leite', 'chocolate', 'ninho', 'morango'], (SELECT id FROM subcategory_id), true, 8),
('Prestígio', 'Pizza prestígio', 79.90, ARRAY['Creme de leite', 'chocolate', 'coco ralado', 'leite condensado'], (SELECT id FROM subcategory_id), true, 9),
('Romeu e Julieta', 'Pizza romeu e julieta', 79.90, ARRAY['Creme de leite', 'mussarela', 'goiabada'], (SELECT id FROM subcategory_id), true, 10);

-- Inserir produtos - Pizzas Broto Salgadas
WITH subcategory_id AS (
  SELECT s.id FROM subcategories s
  JOIN categories c ON s.category_id = c.id
  WHERE c.name = 'Pizzas Broto' AND s.name = 'Salgadas'
)
INSERT INTO products (name, description, price, ingredients, subcategory_id, is_available, order_position) VALUES
('A Moda do Rei', 'Pizza especial da casa', 69.90, ARRAY['Mussarela', 'calabresa moída', 'palmito', 'catupiry', 'cebola', 'manjericão', 'azeitonas fatiadas'], (SELECT id FROM subcategory_id), true, 1),
('Aliche', 'Com filé de aliche', 64.90, ARRAY['Filé de aliche', 'mussarela', 'tomate picado'], (SELECT id FROM subcategory_id), true, 2),
('Atum', 'Pizza de atum', 64.90, ARRAY['Mussarela', 'atum', 'cebola'], (SELECT id FROM subcategory_id), true, 3),
('Bacon', 'Pizza com bacon', 64.90, ARRAY['Mussarela', 'bacon'], (SELECT id FROM subcategory_id), true, 4),
('Baiana', 'Pizza picante', 64.90, ARRAY['Calabresa moída', 'ovos', 'cebola', 'pimenta calabresa'], (SELECT id FROM subcategory_id), true, 5),
('Bauru', 'Pizza bauru', 64.90, ARRAY['Mussarela', 'presunto', 'tomate picado'], (SELECT id FROM subcategory_id), true, 6),
('Brócolis 1', 'Brócolis com bacon', 64.90, ARRAY['Brócolis', 'bacon', 'catupiry'], (SELECT id FROM subcategory_id), true, 7),
('Brócolis 2', 'Brócolis com peru', 64.90, ARRAY['Brócolis', 'peito de peru', 'mussarela'], (SELECT id FROM subcategory_id), true, 8),
('Brócolis 3', 'Brócolis com bacon e mussarela', 64.90, ARRAY['Brócolis', 'bacon', 'mussarela'], (SELECT id FROM subcategory_id), true, 9),
('Caipira', 'Pizza caipira', 64.90, ARRAY['Frango desfiado', 'milho', 'catupiry'], (SELECT id FROM subcategory_id), true, 10),
('Calabresa 1', 'Calabresa tradicional', 64.90, ARRAY['Calabresa fatiada', 'cebola', 'parmesão'], (SELECT id FROM subcategory_id), true, 11),
('Calabresa 2', 'Calabresa com mussarela', 64.90, ARRAY['Calabresa fatiada', 'mussarela', 'parmesão'], (SELECT id FROM subcategory_id), true, 12),
('Calabresa 3', 'Calabresa com catupiry', 64.90, ARRAY['Calabresa fatiada', 'catupiry'], (SELECT id FROM subcategory_id), true, 13),
('Calabresa 4', 'Calabresa completa', 64.90, ARRAY['Calabresa fatiada', 'cebola', 'mussarela'], (SELECT id FROM subcategory_id), true, 14),
('Carne seca', 'Pizza de carne seca', 69.90, ARRAY['Mussarela', 'carne seca', 'catupiry'], (SELECT id FROM subcategory_id), true, 15),
('Costela bovina', 'Pizza de costela', 69.90, ARRAY['Mussarela', 'costela bovina desfiada', 'cebola', 'pimentão'], (SELECT id FROM subcategory_id), true, 16),
('Dois queijos', 'Pizza dois queijos', 64.90, ARRAY['Mussarela', 'catupiry'], (SELECT id FROM subcategory_id), true, 17),
('Doritos', 'Pizza com doritos', 69.90, ARRAY['Mussarela', 'bacon', 'cheddar', 'doritos'], (SELECT id FROM subcategory_id), true, 18),
('Frango catupiry', 'Frango com catupiry', 67.90, ARRAY['Frango desfiado', 'catupiry'], (SELECT id FROM subcategory_id), true, 19),
('Frango com bacon', 'Frango com bacon', 67.90, ARRAY['Frango desfiado', 'bacon', 'catupiry'], (SELECT id FROM subcategory_id), true, 20),
('Frango com cheddar', 'Frango com cheddar', 67.90, ARRAY['Frango desfiado', 'cheddar'], (SELECT id FROM subcategory_id), true, 21),
('Frango com mussarela', 'Frango com mussarela', 67.90, ARRAY['Frango desfiado', 'mussarela'], (SELECT id FROM subcategory_id), true, 22),
('Marguerita', 'Pizza marguerita', 64.90, ARRAY['Mussarela', 'tomate', 'manjericão'], (SELECT id FROM subcategory_id), true, 23),
('Milho', 'Pizza de milho', 64.90, ARRAY['Mussarela', 'milho'], (SELECT id FROM subcategory_id), true, 24),
('Mussarela', 'Pizza de mussarela', 64.90, ARRAY['Mussarela', 'molho artesanal da casa'], (SELECT id FROM subcategory_id), true, 25),
('Palmito', 'Pizza de palmito', 64.90, ARRAY['Mussarela', 'palmito', 'azeitona fatiada'], (SELECT id FROM subcategory_id), true, 26),
('Parma', 'Pizza com presunto parma', 69.90, ARRAY['Mussarela', 'presunto parma', 'rúcula'], (SELECT id FROM subcategory_id), true, 27),
('Peito de peru', 'Pizza de peito de peru', 64.90, ARRAY['Mussarela', 'peito de peru'], (SELECT id FROM subcategory_id), true, 28),
('Pepperoni', 'Pizza de pepperoni', 67.90, ARRAY['Mussarela', 'pepperoni'], (SELECT id FROM subcategory_id), true, 29),
('Portuguesa', 'Pizza portuguesa', 67.90, ARRAY['Mussarela', 'presunto', 'milho', 'ovos', 'cebola'], (SELECT id FROM subcategory_id), true, 30),
('Quatro queijos', 'Pizza quatro queijos', 64.90, ARRAY['Mussarela', 'gorgonzola', 'parmesão', 'catupiry'], (SELECT id FROM subcategory_id), true, 31),
('Rúcula', 'Pizza de rúcula', 64.90, ARRAY['Mussarela', 'rúcula'], (SELECT id FROM subcategory_id), true, 32),
('Siciliana', 'Pizza siciliana', 64.90, ARRAY['Mussarela', 'champignon', 'bacon'], (SELECT id FROM subcategory_id), true, 33),
('Strogonoff de frango', 'Pizza strogonoff', 67.90, ARRAY['Mussarela', 'strogonoff de frango', 'batata palha'], (SELECT id FROM subcategory_id), true, 34),
('Três queijos', 'Pizza três queijos', 64.90, ARRAY['Mussarela', 'gorgonzola', 'catupiry'], (SELECT id FROM subcategory_id), true, 35),
('Vegetariana', 'Pizza vegetariana', 64.90, ARRAY['Mussarela', 'palmito', 'champignon'], (SELECT id FROM subcategory_id), true, 36),
('Zucchini', 'Pizza de abobrinha', 64.90, ARRAY['Mussarela', 'abobrinha', 'catupiry', 'tomate picado'], (SELECT id FROM subcategory_id), true, 37);

-- Inserir produtos - Pizzas Broto Doces
WITH subcategory_id AS (
  SELECT s.id FROM subcategories s
  JOIN categories c ON s.category_id = c.id
  WHERE c.name = 'Pizzas Broto' AND s.name = 'Doces'
)
INSERT INTO products (name, description, price, ingredients, subcategory_id, is_available, order_position) VALUES
('Abacaxi', 'Pizza doce de abacaxi', 64.90, ARRAY['Creme de leite', 'abacaxi', 'chocolate branco', 'coco ralado'], (SELECT id FROM subcategory_id), true, 1),
('Abacaxi 2', 'Pizza doce de abacaxi com canela', 64.90, ARRAY['Creme de leite', 'abacaxi', 'canela', 'açúcar'], (SELECT id FROM subcategory_id), true, 2),
('Brigadeiro', 'Pizza de brigadeiro', 64.90, ARRAY['Creme de leite', 'chocolate', 'granulado'], (SELECT id FROM subcategory_id), true, 3),
('Chocolate', 'Pizza de chocolate', 64.90, ARRAY['Creme de leite', 'chocolate'], (SELECT id FROM subcategory_id), true, 4),
('Confetes', 'Pizza com confetes', 64.90, ARRAY['Creme de leite', 'chocolate', 'confetes'], (SELECT id FROM subcategory_id), true, 5),
('Ninho', 'Pizza de ninho', 64.90, ARRAY['Creme de leite', 'chocolate', 'ninho'], (SELECT id FROM subcategory_id), true, 6),
('Ninho com coco', 'Pizza de ninho com coco', 64.90, ARRAY['Creme de leite', 'chocolate', 'ninho', 'coco ralado'], (SELECT id FROM subcategory_id), true, 7),
('Ninho com morango', 'Pizza de ninho com morango', 64.90, ARRAY['Creme de leite', 'chocolate', 'ninho', 'morango'], (SELECT id FROM subcategory_id), true, 8),
('Prestígio', 'Pizza prestígio', 64.90, ARRAY['Creme de leite', 'chocolate', 'coco ralado', 'leite condensado'], (SELECT id FROM subcategory_id), true, 9),
('Romeu e Julieta', 'Pizza romeu e julieta', 64.90, ARRAY['Creme de leite', 'mussarela', 'goiabada'], (SELECT id FROM subcategory_id), true, 10);

-- Inserir produtos - Águas
WITH category_id AS (
  SELECT id FROM categories WHERE name = 'Águas'
)
INSERT INTO products (name, description, price, ingredients, category_id, is_available, order_position) VALUES
('Água sem gás 510ml', 'Água mineral natural', 3.00, ARRAY['Água mineral natural'], (SELECT id FROM category_id), true, 1),
('Água com gás 500ml', 'Água mineral com gás', 4.00, ARRAY['Água mineral com gás'], (SELECT id FROM category_id), true, 2),
('Água sem gás 1500ml', 'Água mineral natural', 7.00, ARRAY['Água mineral natural'], (SELECT id FROM category_id), true, 3),
('Tônica Lata', 'Água tônica gelada', 6.00, ARRAY['Água tônica'], (SELECT id FROM category_id), true, 4);

-- Inserir produtos - Cervejas
WITH category_id AS (
  SELECT id FROM categories WHERE name = 'Cervejas'
)
INSERT INTO products (name, description, price, ingredients, category_id, is_available, order_position) VALUES
('Skol Lata 350ml', 'Cerveja pilsen gelada', 4.50, ARRAY['Cerveja pilsen gelada'], (SELECT id FROM category_id), true, 1),
('Heineken Long Neck', 'Cerveja puro malte', 9.00, ARRAY['Cerveja puro malte'], (SELECT id FROM category_id), true, 2),
('Brahma Chopp 350ml', 'Cerveja chopp', 6.00, ARRAY['Cerveja chopp'], (SELECT id FROM category_id), true, 3),
('Brahma Duplo Malte 310ml', 'Cerveja duplo malte', 7.00, ARRAY['Cerveja duplo malte'], (SELECT id FROM category_id), true, 4),
('Budweiser Long Neck', 'Cerveja premium', 10.00, ARRAY['Cerveja premium'], (SELECT id FROM category_id), true, 5),
('Corona Long Neck', 'Cerveja mexicana', 12.00, ARRAY['Cerveja mexicana'], (SELECT id FROM category_id), true, 6),
('Stella Artois Long Neck', 'Cerveja belga', 10.00, ARRAY['Cerveja belga'], (SELECT id FROM category_id), true, 7);

-- Inserir produtos - Sucos
WITH category_id AS (
  SELECT id FROM categories WHERE name = 'Sucos'
)
INSERT INTO products (name, description, price, ingredients, category_id, is_available, order_position) VALUES
('Del Valle Laranja 1L', 'Suco de laranja', 12.00, ARRAY['Suco de laranja'], (SELECT id FROM category_id), true, 1),
('Del Valle Maracujá 1L', 'Suco de maracujá', 12.00, ARRAY['Suco de maracujá'], (SELECT id FROM category_id), true, 2),
('Del Valle Maracujá 290ml', 'Suco de maracujá', 6.00, ARRAY['Suco de maracujá'], (SELECT id FROM category_id), true, 3),
('Del Valle Uva 1L', 'Suco de uva', 12.00, ARRAY['Suco de uva'], (SELECT id FROM category_id), true, 4),
('Del Valle Uva 290ml', 'Suco de uva', 6.00, ARRAY['Suco de uva'], (SELECT id FROM category_id), true, 5);

-- Inserir produtos - Refrigerantes
WITH category_id AS (
  SELECT id FROM categories WHERE name = 'Refrigerantes'
)
INSERT INTO products (name, description, price, ingredients, category_id, is_available, order_position) VALUES
('Coca-Cola Lata 350ml', 'Refrigerante cola', 6.00, ARRAY['Refrigerante cola'], (SELECT id FROM category_id), true, 1),
('Guaraná Antárctica 2L', 'Refrigerante guaraná', 8.50, ARRAY['Refrigerante guaraná'], (SELECT id FROM category_id), true, 2),
('Coca-Cola 2L', 'Refrigerante cola', 16.00, ARRAY['Refrigerante cola'], (SELECT id FROM category_id), true, 3),
('Coca-Cola Sem Açúcar 2L', 'Refrigerante cola sem açúcar', 16.00, ARRAY['Refrigerante cola sem açúcar'], (SELECT id FROM category_id), true, 4),
('Coca-Cola Zero Lata 350ml', 'Refrigerante cola zero', 6.00, ARRAY['Refrigerante cola zero'], (SELECT id FROM category_id), true, 5),
('Fanta Laranja Lata 350ml', 'Refrigerante laranja', 6.00, ARRAY['Refrigerante laranja'], (SELECT id FROM category_id), true, 6),
('Guaraná Antarctica 1L', 'Refrigerante guaraná', 9.00, ARRAY['Refrigerante guaraná'], (SELECT id FROM category_id), true, 7),
('Guaraná Antarctica 2L', 'Refrigerante guaraná', 15.00, ARRAY['Refrigerante guaraná'], (SELECT id FROM category_id), true, 8),
('Guaraná Antarctica Lata 350ml', 'Refrigerante guaraná', 6.00, ARRAY['Refrigerante guaraná'], (SELECT id FROM category_id), true, 9),
('H2O Limoneto', 'Bebida sabor limão', 7.00, ARRAY['Bebida sabor limão'], (SELECT id FROM category_id), true, 10),
('Schweppes Citrus Lata', 'Refrigerante citrus', 6.00, ARRAY['Refrigerante citrus'], (SELECT id FROM category_id), true, 11),
('Soda 2L', 'Água com gás', 13.00, ARRAY['Água com gás'], (SELECT id FROM category_id), true, 12),
('Sukita Laranja 2L', 'Refrigerante laranja', 13.00, ARRAY['Refrigerante laranja'], (SELECT id FROM category_id), true, 13),
('Sukita Uva 2L', 'Refrigerante uva', 13.00, ARRAY['Refrigerante uva'], (SELECT id FROM category_id), true, 14),
('Red Bull', 'Energético', 13.00, ARRAY['Energético'], (SELECT id FROM category_id), true, 15);