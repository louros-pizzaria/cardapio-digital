-- Create main Bebidas category
INSERT INTO categories (id, name, description, icon, order_position) VALUES 
('11111111-1111-1111-1111-111111111111', 'Bebidas', 'Todas as bebidas disponíveis', '🥤', 3);

-- Update existing beverage categories to be subcategories
UPDATE categories SET name = 'temp_aguas' WHERE name = 'Águas';
UPDATE categories SET name = 'temp_cervejas' WHERE name = 'Cervejas';  
UPDATE categories SET name = 'temp_sucos' WHERE name = 'Sucos';
UPDATE categories SET name = 'temp_refrigerantes' WHERE name = 'Refrigerantes';

-- Create subcategories for beverages
INSERT INTO subcategories (id, name, description, category_id, order_position) VALUES
('22222222-2222-2222-2222-222222222221', 'Águas', 'Águas minerais e com gás', '11111111-1111-1111-1111-111111111111', 1),
('22222222-2222-2222-2222-222222222222', 'Cervejas', 'Cervejas nacionais e importadas', '11111111-1111-1111-1111-111111111111', 2),
('22222222-2222-2222-2222-222222222223', 'Sucos', 'Sucos naturais e industrializados', '11111111-1111-1111-1111-111111111111', 3),
('22222222-2222-2222-2222-222222222224', 'Refrigerantes', 'Refrigerantes e energéticos', '11111111-1111-1111-1111-111111111111', 4);

-- Update products to reference subcategories instead of categories
UPDATE products SET 
  category_id = '11111111-1111-1111-1111-111111111111',
  subcategory_id = '22222222-2222-2222-2222-222222222221'
WHERE category_id = (SELECT id FROM categories WHERE name = 'temp_aguas');

UPDATE products SET 
  category_id = '11111111-1111-1111-1111-111111111111',
  subcategory_id = '22222222-2222-2222-2222-222222222222'
WHERE category_id = (SELECT id FROM categories WHERE name = 'temp_cervejas');

UPDATE products SET 
  category_id = '11111111-1111-1111-1111-111111111111',
  subcategory_id = '22222222-2222-2222-2222-222222222223'
WHERE category_id = (SELECT id FROM categories WHERE name = 'temp_sucos');

UPDATE products SET 
  category_id = '11111111-1111-1111-1111-111111111111',
  subcategory_id = '22222222-2222-2222-2222-222222222224'
WHERE category_id = (SELECT id FROM categories WHERE name = 'temp_refrigerantes');

-- Delete old beverage categories
DELETE FROM categories WHERE name IN ('temp_aguas', 'temp_cervejas', 'temp_sucos', 'temp_refrigerantes');