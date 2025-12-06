import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { applyStrategy } from '@/config/queryCacheMapping';
import { CartItem } from '@/types';

interface ProductInfo {
  id: string;
  name: string;
  category_name: string;
  subcategory_name: string;
}

export const useCartProducts = (items: CartItem[]) => {
  const productIds = items.map(item => item.productId);

  const { data: productsInfo = [], isLoading, error } = useQuery({
    queryKey: ['cart-products', productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          categories:category_id (name),
          subcategories:subcategory_id (
            name,
            categories:category_id (name)
          )
        `)
        .in('id', productIds);

      if (error) {
        console.error('[CART-PRODUCTS] Error fetching products:', error);
        throw error;
      }

      return (data || []).map((p: any) => {
        // Priorizar categoria direta do produto, depois categoria da subcategoria
        let categoryName = p.categories?.name;
        
        if (!categoryName && p.subcategories?.categories?.name) {
          categoryName = p.subcategories.categories.name;
        }
        
        if (!categoryName) {
          categoryName = 'Produto';
        }
        
        return {
          id: p.id,
          name: p.name,
          category_name: categoryName,
          subcategory_name: p.subcategories?.name || ''
        };
      }) as ProductInfo[];
    },
    enabled: productIds.length > 0,
    ...applyStrategy('cartProducts'),
    retry: 2,
  });

  const getProductInfo = (productId: string): ProductInfo | undefined => {
    return productsInfo.find(p => p.id === productId);
  };

  return {
    productsInfo,
    getProductInfo,
    isLoading,
    error
  };
};
