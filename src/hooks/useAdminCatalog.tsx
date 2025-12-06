import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyStrategy } from '@/config/queryCacheMapping';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  order_position: number;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  description?: string;
  is_active: boolean;
  order_position: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  subcategory_id?: string;
  image_url?: string;
  is_available: boolean;
  order_position: number;
  ingredients?: string[];
}

export const useAdminCatalog = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Buscar categorias com subcategorias
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['admin-categories-with-subs'],
    queryFn: async () => {
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (catsError) throw catsError;

      const { data: subs, error: subsError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (subsError) throw subsError;

      return cats.map(cat => ({
        ...cat,
        subcategories: subs.filter(sub => sub.category_id === cat.id)
      })) as Category[];
    },
    ...applyStrategy('categories'),
  });

  // Buscar produtos filtrados
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-catalog-products', selectedCategoryId, selectedSubcategoryId],
    queryFn: async () => {
      let query = supabase.from('products').select('*');

      if (selectedSubcategoryId) {
        query = query.eq('subcategory_id', selectedSubcategoryId);
      } else if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId);
      }

      const { data, error } = await query.order('order_position', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    ...applyStrategy('products'),
  });

  const selectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null);
  };

  const selectSubcategory = (subcategoryId: string, categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
  };

  const clearSelection = () => {
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || null;
  const selectedSubcategory = selectedCategory?.subcategories?.find(
    s => s.id === selectedSubcategoryId
  ) || null;

  return {
    categories,
    selectedCategory,
    selectedSubcategory,
    products,
    loading: loadingCategories || loadingProducts,
    selectCategory,
    selectSubcategory,
    clearSelection,
  };
};
