// ===== HOOK ADMIN ORDERS ACTIONS - FASE 2.4 =====
// Responsável por ações (mutations) para pedidos admin
// - updateOrderStatus
// - cancelOrder
// - Helper functions (confirmOrder, startPreparing, etc.)
// - Invalidação de cache

import { useCallback } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { memoryCache } from '@/utils/performance';
import type { AdminOrder } from './useAdminOrdersQuery';

interface ActionsOptions {
  queryKey: QueryKey;
}

export const useAdminOrdersActions = (options: ActionsOptions) => {
  const { queryKey } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update order status with optimistic update
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    newStatus: AdminOrder['status'], 
    notes?: string
  ) => {
    try {
      // Optimistic update
      queryClient.setQueryData(queryKey, (oldData: AdminOrder[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, notes, updated_at: new Date().toISOString() }
            : order
        );
      });

      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (notes) updateData.notes = notes;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Pedido marcado como ${newStatus}`,
      });

      // Clear relevant cache
      memoryCache.clear();

    } catch (error) {
      console.error('❌ Error updating order status:', error);
      
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pedido",
        variant: "destructive"
      });
    }
  }, [queryClient, toast, queryKey]);

  // Helper functions for status updates
  const confirmOrder = useCallback((orderId: string) => 
    updateOrderStatus(orderId, 'confirmed'), [updateOrderStatus]);

  const startPreparing = useCallback((orderId: string) => 
    updateOrderStatus(orderId, 'preparing'), [updateOrderStatus]);

  const markReady = useCallback((orderId: string) => 
    updateOrderStatus(orderId, 'ready'), [updateOrderStatus]);

  const markInDelivery = useCallback((orderId: string) => 
    updateOrderStatus(orderId, 'in_delivery'), [updateOrderStatus]);

  const markDelivered = useCallback((orderId: string) => 
    updateOrderStatus(orderId, 'delivered'), [updateOrderStatus]);

  const cancelOrder = useCallback((orderId: string, reason?: string) => 
    updateOrderStatus(orderId, 'cancelled', reason), [updateOrderStatus]);

  return {
    updateOrderStatus,
    confirmOrder,
    startPreparing,
    markReady,
    markInDelivery,
    markDelivered,
    cancelOrder,
  };
};
