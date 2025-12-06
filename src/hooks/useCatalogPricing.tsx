import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CatalogPricingResult {
  crustById: Record<string, { id: string; name: string; price: number }>;
  crustByName: Record<string, { id: string; name: string; price: number }>;
  extraById: Record<string, { id: string; name: string; price: number }>;
  extraByName: Record<string, { id: string; name: string; price: number }>;
}

export const useCatalogPricing = () => {
  const { data, isLoading } = useQuery<CatalogPricingResult>({
    queryKey: ['catalog-pricing'],
    queryFn: async () => {
      const [crustsRes, extrasRes] = await Promise.all([
        supabase.from('product_crusts').select('id,name,price,is_active').eq('is_active', true),
        supabase.from('product_extras').select('id,name,price,is_active').eq('is_active', true),
      ]);

      if (crustsRes.error) throw crustsRes.error;
      if (extrasRes.error) throw extrasRes.error;

      const crustById: CatalogPricingResult['crustById'] = {};
      const crustByName: CatalogPricingResult['crustByName'] = {};
      (crustsRes.data || []).forEach((c: any) => {
        crustById[c.id] = { id: c.id, name: c.name, price: c.price };
        crustByName[c.name] = { id: c.id, name: c.name, price: c.price };
      });

      const extraById: CatalogPricingResult['extraById'] = {};
      const extraByName: CatalogPricingResult['extraByName'] = {};
      (extrasRes.data || []).forEach((e: any) => {
        extraById[e.id] = { id: e.id, name: e.name, price: e.price };
        extraByName[e.name] = { id: e.id, name: e.name, price: e.price };
      });

      return { crustById, crustByName, extraById, extraByName };
    },
    staleTime: 5 * 60 * 1000,
  });

  return { ...(data || { crustById: {}, crustByName: {}, extraById: {}, extraByName: {} }), loading: isLoading };
};
