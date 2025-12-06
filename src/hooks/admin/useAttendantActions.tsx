import { useState } from 'react';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useAttendantActions = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const updateOrderStatus = async (
    orderId: string,
    newStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_delivery' | 'delivered' | 'cancelled' | 'pending_payment',
    additionalData: Record<string, any> = {}
  ) => {
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...additionalData,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['attendant-data'] });

      toast.success('Status do pedido atualizado!');
      return true;
    } catch (error: any) {
      console.error('[ATTENDANT] ❌ Error updating order:', error);
      toast.error(error.message || 'Erro ao atualizar pedido');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmOrder = async (orderId: string) => {
    console.log('[ATTENDANT] ✅ Confirming order:', orderId);
    return await updateOrderStatus(orderId, 'confirmed');
  };

  const startPreparation = async (orderId: string) => {
    console.log('[ATTENDANT] 👨‍🍳 Starting preparation:', orderId);
    return await updateOrderStatus(orderId, 'preparing');
  };

  const markReady = async (orderId: string, deliveryMethod?: string) => {
    console.log('[ATTENDANT] 🎉 Marking as ready:', orderId, deliveryMethod);
    return await updateOrderStatus(orderId, 'ready');
  };

  const markPickedUp = async (orderId: string) => {
    console.log('[ATTENDANT] 📦 Marking as picked up:', orderId);
    return await updateOrderStatus(orderId, 'picked_up');
  };

  const markInDelivery = async (orderId: string) => {
    console.log('[ATTENDANT] 🚚 Marking as in delivery:', orderId);
    return await updateOrderStatus(orderId, 'in_delivery');
  };

  const markDelivered = async (orderId: string) => {
    console.log('[ATTENDANT] ✅ Marking as delivered:', orderId);
    return await updateOrderStatus(orderId, 'delivered');
  };

  const cancelOrder = async (orderId: string, reason?: string) => {
    console.log('[ATTENDANT] ❌ Cancelling order:', orderId, reason);
    return await updateOrderStatus(orderId, 'cancelled', {
      notes: reason ? `Cancelado: ${reason}` : undefined
    });
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    console.log('[ATTENDANT] 💰 Updating payment status:', orderId, paymentStatus);
    
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['attendant-data'] });
      toast.success('Status de pagamento atualizado!');
      return true;
    } catch (error: any) {
      console.error('[ATTENDANT] ❌ Error updating payment:', error);
      toast.error(error.message || 'Erro ao atualizar pagamento');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    isUpdating,
    updateOrderStatus,
    confirmOrder,
    startPreparation,
    markReady,
    markPickedUp,
    markInDelivery,
    markDelivered,
    cancelOrder,
    updatePaymentStatus,
  };
};
