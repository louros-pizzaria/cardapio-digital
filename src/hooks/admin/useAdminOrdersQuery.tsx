// ===== HOOK ADMIN ORDERS QUERY - FASE 2.4 =====
// Responsável apenas por buscar dados de pedidos admin
// - React Query setup
// - Cache management
// - Query deduplication
// - Fetch optimization

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyStrategy } from '@/config/queryCacheMapping';
import { memoryCache } from '@/utils/performance';

export interface AdminOrder {
  id: string;
  user_id: string;
  status: 'pending_payment' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_delivery' | 'delivering' | 'delivered' | 'cancelled' | 'expired';
  total_amount: number;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  addresses?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    complement?: string;
  };
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      name: string;
      price: number;
    };
  }>;
}

interface QueryOptions {
  status?: string;
  limit?: number;
  userId?: string;
}

// Query deduplication map
const activeQueries = new Map<string, Promise<AdminOrder[]>>();

// OTIMIZAÇÃO: Query otimizada sem JOINs desnecessários
async function fetchOrdersOptimized(status?: string, limit: number = 50): Promise<AdminOrder[]> {
  console.log('🌐 Fetching optimized admin orders');
  
  let query = supabase
    .from('orders')
    .select(`
      id,
      user_id,
      status,
      total_amount,
      delivery_fee,
      payment_method,
      payment_status,
      created_at,
      updated_at,
      notes,
      delivery_address_snapshot,
      address_id,
      delivery_method,
      customer_name,
      customer_phone,
      discount_amount,
      coupon_code
    `)
    .order('created_at', { ascending: false });

  // Apply filters - EXCLUIR pedidos com payment_status pending para o painel principal
  if (status) {
    if (status === 'pending') {
      // Para aba "pending", mostrar apenas pedidos confirmados em preparo
      query = query.in('status', ['confirmed', 'preparing']);
    } else if (status === 'awaiting-payment') {
      // Nova aba para pedidos aguardando pagamento
      query = query.eq('payment_status', 'pending');
    } else {
      query = query.eq('status', status as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_delivery' | 'delivered' | 'cancelled');
    }
  } else {
    // Por padrão, filtrar apenas pedidos com pagamento confirmado ou processado
    query = query.not('payment_status', 'eq', 'pending');
  }

  query = query.limit(limit);

  const { data: orders, error } = await query;
  
  if (error) throw error;

  // Fetch related data only when needed (lazy loading approach)
  if (orders && orders.length > 0) {
    const userIds = [...new Set(orders.map(order => order.user_id))];
    
    // Parallel fetch for related data
    const [profilesRes, addressesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds),
      supabase
        .from('addresses')
        .select('user_id, street, number, neighborhood, city, complement')
        .in('user_id', userIds)
    ]);

    // Map related data
    const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
    const addressesMap = new Map(addressesRes.data?.map(a => [a.user_id, a]) || []);

    return orders.map(order => ({
      ...order,
      profiles: profilesMap.get(order.user_id),
      addresses: addressesMap.get(order.user_id),
      order_items: [] // Load on demand
    }));
  }

  return orders || [];
}

export const useAdminOrdersQuery = (options: QueryOptions = {}) => {
  const { status, limit = 50, userId } = options;

  // Query key baseada em parâmetros
  const queryKey = ['admin-orders-optimized', { status, limit }];
  const cacheKey = `admin-orders-${status || 'all'}-${limit}`;

  // Query consolidada com cache inteligente
  const { data: orders = [], isLoading, refetch, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<AdminOrder[]> => {
      // Check memory cache first
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        console.log('⚡ Cache HIT: Admin orders from memory');
        return cached;
      }

      // Query deduplication
      const queryId = JSON.stringify({ status, limit });
      if (activeQueries.has(queryId)) {
        console.log('🔄 Deduplicating concurrent query');
        return activeQueries.get(queryId)!;
      }

      const queryPromise = fetchOrdersOptimized(status, limit);
      activeQueries.set(queryId, queryPromise);

      try {
        const result = await queryPromise;
        // Cache for 1 minute
        memoryCache.set(cacheKey, result, 60 * 1000);
        return result;
      } finally {
        activeQueries.delete(queryId);
      }
    },
    enabled: !!userId,
    ...applyStrategy('adminOrders'),
  });

  const refreshOrders = () => {
    memoryCache.clear();
    refetch();
  };

  return {
    orders,
    isLoading,
    error,
    refetch,
    refreshOrders,
    queryKey,
    cacheKey,
  };
};
