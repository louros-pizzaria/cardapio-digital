import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { applyStrategy } from '@/config/queryCacheMapping';

export interface DeliveryZone {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  estimated_time: number;
  is_active: boolean;
}

export const useDeliveryZones = () => {
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('neighborhood');

      if (error) throw error;
      return data as DeliveryZone[];
    },
    ...applyStrategy('deliveryZones'),
  });

  const getDeliveryFee = (neighborhood: string) => {
    const zone = zones.find(z => 
      z.neighborhood.toLowerCase() === neighborhood.toLowerCase()
    );
    return zone?.delivery_fee || 0;
  };

  const isNeighborhoodAvailable = (neighborhood: string) => {
    return zones.some(z => 
      z.neighborhood.toLowerCase() === neighborhood.toLowerCase()
    );
  };

  return {
    zones,
    isLoading,
    getDeliveryFee,
    isNeighborhoodAvailable
  };
};
