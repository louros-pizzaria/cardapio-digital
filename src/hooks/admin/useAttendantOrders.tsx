import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export interface AttendantOrder {
  id: string;
  user_id: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  delivery_fee: number | null;
  delivery_method: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address_snapshot: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    customizations: any;
    products: {
      name: string;
      image_url: string;
    };
  }>;
}

export interface AttendantStats {
  total_orders: number;
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  completed_orders: number;
  total_revenue: number;
  avg_preparation_time: number;
  pending_payments: number;
  presencial_orders: number;
  to_collect_orders: number;
}

interface UseAttendantOrdersOptions {
  status?: string;
  limit?: number;
}

export const useAttendantOrders = (options: UseAttendantOrdersOptions = {}) => {
  const { status, limit = 50 } = options;

  const { data: combinedData, isLoading, error, refetch } = useQuery({
    queryKey: ['attendant-data', status],
    queryFn: async () => {
      // Diagnóstico de autenticação
      const { data: session } = await supabase.auth.getSession();
      console.log('[ATTENDANT] 🔍 Diagnóstico completo:', {
        userId: session?.session?.user?.id,
        userEmail: session?.session?.user?.email,
        sessionValid: !!session?.session,
        attempting: 'fetch orders with RLS'
      });

      // Build query - apenas pedidos das últimas 24 horas
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (name, image_url)
          )
        `)
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply status filter if provided
      if (status && ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_delivery', 'delivered', 'cancelled', 'pending_payment'].includes(status)) {
        ordersQuery = ordersQuery.eq('status', status as any);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error('[ATTENDANT] ❌ Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('[ATTENDANT] 📊 Query result:', {
        ordersCount: orders?.length || 0,
        hasError: !!ordersError,
        errorMessage: ordersError?.message,
        first3Orders: orders?.slice(0, 3).map(o => ({
          id: o.id,
          status: o.status,
          customer: o.customer_name
        }))
      });

      // Fetch user profiles for email
      const userIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
      let profiles: any[] = [];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, cpf')
          .in('id', userIds);
        
        profiles = profilesData || [];
      }

      // Merge orders with profiles - priorizar dados do pedido
      const ordersWithProfiles = orders?.map(order => {
        const profile = profiles.find(p => p.id === order.user_id);
        return {
          ...order,
          customer_email: order.customer_email || profile?.email,
          customer_cpf: order.customer_cpf || profile?.cpf || undefined
        };
      }) as AttendantOrder[];

      // Calculate stats
      const stats: AttendantStats = {
        total_orders: ordersWithProfiles?.length || 0,
        pending_orders: ordersWithProfiles?.filter(o => o.status === 'pending').length || 0,
        preparing_orders: ordersWithProfiles?.filter(o => o.status === 'confirmed' || o.status === 'preparing').length || 0,
        ready_orders: ordersWithProfiles?.filter(o => o.status === 'ready').length || 0,
        completed_orders: ordersWithProfiles?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0,
        total_revenue: ordersWithProfiles?.reduce((sum, o) => {
          if (['completed', 'delivered', 'confirmed', 'preparing', 'ready'].includes(o.status)) {
            return sum + o.total_amount;
          }
          return sum;
        }, 0) || 0,
        avg_preparation_time: 0,
        pending_payments: ordersWithProfiles?.filter(o => o.payment_status === 'pending').length || 0,
        presencial_orders: ordersWithProfiles?.filter(o => 
          ['cash', 'credit_card_delivery', 'debit_card_delivery'].includes(o.payment_method)
        ).length || 0,
        to_collect_orders: ordersWithProfiles?.filter(o => o.payment_status === 'to_collect').length || 0,
      };

      console.log('[ATTENDANT] 📊 Pedidos carregados:', {
        total: stats.total_orders,
        confirmed: stats.preparing_orders,
        to_collect: stats.to_collect_orders,
        presencial: stats.presencial_orders,
        confirmed_presencial: ordersWithProfiles?.filter(o => 
          o.status === 'confirmed' && ['cash', 'credit_card_delivery'].includes(o.payment_method)
        ).length
      });

      return {
        orders: ordersWithProfiles,
        stats
      };
    },
    staleTime: 0, // Always refetch when invalidated
    refetchInterval: false, // Realtime handles updates
    refetchOnWindowFocus: true,
  });

  return {
    orders: combinedData?.orders || [],
    stats: combinedData?.stats || {
      total_orders: 0,
      pending_orders: 0,
      preparing_orders: 0,
      ready_orders: 0,
      completed_orders: 0,
      total_revenue: 0,
      avg_preparation_time: 0,
      pending_payments: 0,
      presencial_orders: 0,
      to_collect_orders: 0,
    },
    isLoading,
    error,
    refetch
  };
};
