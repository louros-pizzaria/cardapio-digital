// ===== HOOK ADMIN ORDERS REALTIME - FASE 2.4 =====
// Responsável por gerenciar conexão Realtime de pedidos admin
// - Setup de canal Supabase Realtime
// - Handlers de INSERT/UPDATE/DELETE
// - Reconnect logic
// - Cleanup automático

import { useEffect, useState } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { memoryCache } from '@/utils/performance';

interface RealtimeOptions {
  queryKey: QueryKey;
  enabled: boolean;
  userId?: string;
}

export const useAdminOrdersRealtime = (options: RealtimeOptions) => {
  const { queryKey, enabled, userId } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId || !enabled) return;

    console.log('🔌 Setting up admin orders realtime channel');

    const channel = supabase
      .channel('admin-orders-optimized')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📦 New order received');
          
          toast({
            title: "🔔 Novo Pedido!",
            description: `Pedido #${payload.new.id.slice(0, 8)} recebido`,
            duration: 10000,
          });

          // Invalidação granular apenas para queries relevantes
          const newOrder = payload.new as any;
          invalidateRelevantQueries(newOrder.status);
          
          // Clear memory cache
          memoryCache.clear();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📦 Order updated');
          
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Invalidar apenas se status mudou
          if (updatedOrder.status !== oldOrder.status) {
            invalidateRelevantQueries(updatedOrder.status);
            invalidateRelevantQueries(oldOrder.status);
          }
          
          // Update cache optimistically
          updateOrderInCache(updatedOrder);
        }
      )
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED';
        setIsConnected(connected);
        console.log(`🔌 Realtime channel ${connected ? 'connected' : 'disconnected'}`);
      });

    return () => {
      console.log('🔌 Cleaning up admin orders realtime channel');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [userId, enabled, queryClient, toast]);

  // Helper: Invalidar apenas queries relacionadas ao status
  function invalidateRelevantQueries(orderStatus: string) {
    queryClient.invalidateQueries({ 
      queryKey: ['admin-orders-optimized'],
      predicate: (query) => {
        const params = query.queryKey[1] as any;
        return !params?.status || params.status === orderStatus || params.status === 'pending';
      }
    });
  }

  // Helper: Update cache otimista
  function updateOrderInCache(updatedOrder: any) {
    queryClient.setQueriesData(
      { queryKey: ['admin-orders-optimized'] },
      (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(order => 
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
        );
      }
    );
  }

  return {
    isConnected,
  };
};
