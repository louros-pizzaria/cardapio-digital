import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryPlatformOrder {
  id: string;
  platform: string;
  external_order_id: string;
  internal_order_id: string | null;
  status: string;
  sync_status: string;
  order_data: any;
  created_at: string;
  updated_at: string;
}

export function useDeliveryIntegrations() {
  // Delivery Platform Orders
  const { data: platformOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['delivery-platform-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_platform_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as DeliveryPlatformOrder[];
    },
  });

  // Delivery Integrations Config
  const { data: integrations, isLoading: loadingIntegrations } = useQuery({
    queryKey: ['delivery-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_integrations')
        .select('*')
        .order('platform', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const stats = {
    totalOrders: platformOrders?.length || 0,
    ifoodOrders: platformOrders?.filter(o => o.platform === 'ifood').length || 0,
    uberEatsOrders: platformOrders?.filter(o => o.platform === 'ubereats').length || 0,
    rappiOrders: platformOrders?.filter(o => o.platform === 'rappi').length || 0,
    syncedOrders: platformOrders?.filter(o => o.sync_status === 'synced').length || 0,
    pendingSync: platformOrders?.filter(o => o.sync_status === 'pending').length || 0,
  };

  const platformStatus = [
    {
      platform: 'iFood',
      status: integrations?.find(i => i.platform === 'ifood')?.is_active ? 'connected' : 'disconnected',
      orders: stats.ifoodOrders,
    },
    {
      platform: 'Uber Eats',
      status: integrations?.find(i => i.platform === 'ubereats')?.is_active ? 'connected' : 'disconnected',
      orders: stats.uberEatsOrders,
    },
    {
      platform: 'Rappi',
      status: integrations?.find(i => i.platform === 'rappi')?.is_active ? 'connected' : 'disconnected',
      orders: stats.rappiOrders,
    },
  ];

  return {
    platformOrders,
    loadingOrders,
    integrations,
    loadingIntegrations,
    stats,
    platformStatus,
  };
}
