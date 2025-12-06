import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { QUERY_KEYS } from '@/services/supabase';
import { CACHE_STRATEGIES } from '@/config/queryClient';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

// ===== HOOK PARA PEDIDOS EM TEMPO REAL OTIMIZADO =====

interface RealtimeOrder {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  payment_status: string;
  notes?: string;
}

export const useRealtimeOrders = () => {
  const { user } = useUnifiedAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Query otimizada para pedidos do usuário
  const { data: orders = [], isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ORDERS, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('🌐 Fetching user orders');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          status,
          total_amount,
          payment_status,
          created_at,
          updated_at,
          notes,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            customizations,
            products (name, price, image_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Limitar para performance

      if (error) throw error;
      
      console.log('✅ Orders fetched successfully:', data?.length);
      return data || [];
    },
    enabled: !!user?.id,
    ...CACHE_STRATEGIES.DYNAMIC, // Cache de 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Função para reconectar com backoff
  const reconnectWithBackoff = useCallback((attempt = 1) => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
    
    console.log(`📡 Reconnecting to realtime in ${delay}ms (attempt ${attempt})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (user?.id && !channelRef.current) {
        setupRealtimeConnection(attempt + 1);
      }
    }, delay);
  }, [user?.id]);

  // Configurar conexão real-time otimizada
  const setupRealtimeConnection = useCallback((reconnectAttempt = 1) => {
    if (!user?.id || channelRef.current) return;

    console.log('📡 Setting up realtime connection for orders');

    const channel = supabase
      .channel(`orders:user:${user.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📦 Order update received:', payload.eventType);
          
          // Invalidar queries de forma inteligente
          queryClient.invalidateQueries({ 
            queryKey: [...QUERY_KEYS.ORDERS, user.id],
            exact: false 
          });

          // Feedback visual para mudanças de status
          if (payload.eventType === 'UPDATE') {
            const newOrder = payload.new as RealtimeOrder;
            console.log(`📦 Order ${newOrder.id} status: ${newOrder.status}`);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Orders realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          channelRef.current = channel;
          
          // Limpar timeout de reconexão
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          channelRef.current = null;
          
          // Tentar reconectar se não foi intencional
          if (user?.id) {
            reconnectWithBackoff(reconnectAttempt);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📡 Realtime channel error:', err);
          setIsConnected(false);
          channelRef.current = null;
          
          // Reconectar em caso de erro
          reconnectWithBackoff(reconnectAttempt);
        }
      });

    return channel;
  }, [user?.id, queryClient, reconnectWithBackoff]);

  // Configurar real-time para pedidos do usuário
  useEffect(() => {
    if (!user?.id) {
      // Cleanup se não há usuário
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Setup inicial da conexão
    setupRealtimeConnection();

    // Cleanup
    return () => {
      console.log('📡 Cleaning up realtime connection');
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [user?.id, setupRealtimeConnection]);

  // Função para atualizar status do pedido (admin/attendant)
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    newStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_delivery' | 'delivered' | 'cancelled'
  ) => {
    console.log(`📦 Updating order ${orderId} status to: ${newStatus}`);
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    // Atualizar cache local de forma otimizada
    queryClient.setQueryData([...QUERY_KEYS.ORDERS, user?.id], (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.map((order: any) => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      );
    });

    console.log('✅ Order status updated successfully');
  }, [queryClient, user?.id]);

  // Função para refresh manual
  const refreshOrders = useCallback(() => {
    console.log('🔄 Manual refresh of orders');
    queryClient.invalidateQueries({ 
      queryKey: [...QUERY_KEYS.ORDERS, user?.id],
      refetchType: 'active' 
    });
  }, [queryClient, user?.id]);

  // Health check da conexão
  const checkConnectionHealth = useCallback(() => {
    if (!isConnected && user?.id) {
      console.log('🏥 Connection health check failed, attempting reconnect');
      setupRealtimeConnection();
    }
  }, [isConnected, user?.id, setupRealtimeConnection]);

  return {
    orders,
    isLoading,
    isConnected,
    updateOrderStatus,
    refreshOrders,
    checkConnectionHealth,
  };
};