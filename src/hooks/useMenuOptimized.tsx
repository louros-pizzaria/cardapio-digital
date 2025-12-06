import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { QUERY_KEYS } from '@/services/supabase';
import { applyStrategy } from '@/config/queryCacheMapping';
import { useToast } from '@/hooks/use-toast';
import { Product, Category, Subcategory, CurrentView } from '@/types';

// ===== HOOK SUPER OTIMIZADO PARA MENU =====

export const useMenuOptimized = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [currentView, setCurrentView] = useState<CurrentView>('categories');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Cache de performance para evitar re-computação
  const computeCache = useRef(new Map());

  // Query para categorias com cache ultra-agressivo (dados estáticos)
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: async () => {
      console.log('🌐 Fetching categories from network');
      
      // Multi-layer cache strategy
      const cacheKey = 'categories_v2';
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Cache de 6 horas para dados estáticos
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 6 * 60 * 60 * 1000) {
        console.log('⚡ Using localStorage cache for categories');
        return JSON.parse(cached);
      }

      // Batch todas as queries necessárias em uma só chamada
      const [categoriesRes, subcategoriesRes, productCountsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, description, icon, order_position, is_active')
          .eq('is_active', true)
          .order('order_position'),
        supabase
          .from('subcategories')
          .select('id, name, description, category_id, order_position, is_active')
          .eq('is_active', true)
          .order('order_position'),
        supabase
          .from('products')
          .select('subcategory_id')
          .eq('is_available', true)
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;
      if (productCountsRes.error) throw productCountsRes.error;

      // Computação otimizada usando Map para O(1) lookup
      const subcategoryProductCounts = new Map();
      productCountsRes.data.forEach(product => {
        if (product.subcategory_id) {
          subcategoryProductCounts.set(
            product.subcategory_id,
            (subcategoryProductCounts.get(product.subcategory_id) || 0) + 1
          );
        }
      });

      // Agrupar subcategorias por categoria para evitar filter repetido
      const subcategoriesByCategory = new Map();
      subcategoriesRes.data.forEach(sub => {
        if (!subcategoriesByCategory.has(sub.category_id)) {
          subcategoriesByCategory.set(sub.category_id, []);
        }
        subcategoriesByCategory.get(sub.category_id).push({
          ...sub,
          product_count: subcategoryProductCounts.get(sub.id) || 0
        });
      });

      const result = categoriesRes.data.map(category => ({
        ...category,
        subcategories: subcategoriesByCategory.get(category.id) || []
      }));

      // Armazenar no localStorage para próximas sessões
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      console.log('✅ Categories cached successfully');
      return result;
    },
    ...applyStrategy('categories'), // Cache de 24h
  });

  // Query para produtos com cache inteligente
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, selectedSubcategoryId],
    queryFn: async () => {
      if (!selectedSubcategoryId) return [];
      
      console.log('🌐 Fetching products for subcategory:', selectedSubcategoryId);
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, ingredients, is_available, order_position, subcategory_id')
        .eq('subcategory_id', selectedSubcategoryId)
        .eq('is_available', true)
        .order('order_position');

      if (error) throw error;
      
      console.log('✅ Products fetched successfully');
      return data || [];
    },
    enabled: !!selectedSubcategoryId && currentView === 'products',
    ...applyStrategy('products'), // Cache dinâmico (5min)
  });

  // Handlers otimizados com useCallback e cache
  const handleSubcategorySelect = useCallback((categoryId: string, subcategoryId: string) => {
    // Pré-carregar produtos em background se possível
    if (subcategoryId) {
      queryClient.prefetchQuery({
        queryKey: [...QUERY_KEYS.PRODUCTS, subcategoryId],
        ...applyStrategy('products'),
      });
    }

    setSelectedCategoryId(categoryId);
    
    if (subcategoryId) {
      setSelectedSubcategoryId(subcategoryId);
      setCurrentView('products');
    } else {
      setCurrentView('subcategories');
    }
  }, [queryClient]);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setCurrentView('categories');
  }, []);

  const handleBackToSubcategories = useCallback(() => {
    setSelectedSubcategoryId("");
    setCurrentView('subcategories');
  }, []);

  // Funções computadas com cache agressivo
  const getCurrentCategoryName = useMemo(() => {
    return () => {
      const cacheKey = `category_name_${selectedCategoryId}`;
      
      if (computeCache.current.has(cacheKey)) {
        return computeCache.current.get(cacheKey);
      }

      const category = categories.find(cat => cat.id === selectedCategoryId);
      const result = category?.name || "";
      
      computeCache.current.set(cacheKey, result);
      return result;
    };
  }, [categories, selectedCategoryId]);

  const getCurrentSubcategoryName = useMemo(() => {
    return () => {
      const cacheKey = `subcategory_name_${selectedCategoryId}_${selectedSubcategoryId}`;
      
      if (computeCache.current.has(cacheKey)) {
        return computeCache.current.get(cacheKey);
      }

      const category = categories.find(cat => cat.id === selectedCategoryId);
      const subcategory = category?.subcategories.find(sub => sub.id === selectedSubcategoryId);
      const result = subcategory?.name || "";
      
      computeCache.current.set(cacheKey, result);
      return result;
    };
  }, [categories, selectedCategoryId, selectedSubcategoryId]);

  // Background refresh para manter dados atualizados
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
    if (selectedSubcategoryId) {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PRODUCTS, selectedSubcategoryId] });
    }
    
    // Limpar cache computacional
    computeCache.current.clear();
  }, [queryClient, selectedSubcategoryId]);

  // Preloading estratégico
  const preloadNextSubcategory = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category && category.subcategories.length > 0) {
      // Pré-carregar produtos da primeira subcategoria
      const firstSubcategory = category.subcategories[0];
      queryClient.prefetchQuery({
        queryKey: [...QUERY_KEYS.PRODUCTS, firstSubcategory.id],
        ...applyStrategy('products'),
      });
    }
  }, [categories, queryClient]);

  return {
    categories,
    products,
    loading: categoriesLoading || productsLoading,
    currentView,
    selectedCategoryId,
    selectedSubcategoryId,
    handleSubcategorySelect,
    handleBackToCategories,
    handleBackToSubcategories,
    getCurrentCategoryName,
    getCurrentSubcategoryName,
    refreshData,
    preloadNextSubcategory,
  };
};