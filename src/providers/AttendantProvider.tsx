import React, { createContext, useContext, ReactNode } from 'react';
import { useAttendantOrders, AttendantOrder, AttendantStats } from '@/hooks/admin/useAttendantOrders';
import { useAttendantActions } from '@/hooks/admin/useAttendantActions';
import { useAttendantRealtime } from '@/hooks/admin/useAttendantRealtime';
import { useAutoPrint } from '@/hooks/useAutoPrint';

// Re-export types
export type { AttendantOrder, AttendantStats } from '@/hooks/admin/useAttendantOrders';

interface AttendantContextType {
  orders: AttendantOrder[];
  stats: AttendantStats;
  loading: boolean;
  isConnected: boolean;
  isUpdating: boolean;
  refreshData: () => void;
  updateOrderStatus: (orderId: string, newStatus: string, deliveryMethod?: string) => Promise<void>;
  confirmOrder: (orderId: string) => Promise<void>;
  startPreparation: (orderId: string) => Promise<void>;
  markReady: (orderId: string, deliveryMethod?: string) => Promise<void>;
  markPickedUp: (orderId: string) => Promise<void>;
  markInDelivery: (orderId: string) => Promise<void>;
  markDelivered: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: string) => Promise<void>;
  autoPrintEnabled: boolean;
}

const AttendantContext = createContext<AttendantContextType | undefined>(undefined);

export const AttendantProvider = ({ children }: { children: ReactNode }) => {
  // Compose specialized hooks
  const { orders, stats, isLoading, refetch } = useAttendantOrders();
  const actions = useAttendantActions();
  const { isConnected } = useAttendantRealtime();
  const { isEnabled: isAutoPrintEnabled } = useAutoPrint();

  // Wrappers to match interface signatures (convert Promise<boolean> to Promise<void>)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, deliveryMethod?: string): Promise<void> => {
    await actions.updateOrderStatus(orderId, newStatus as any, {});
  };

  const handleConfirmOrder = async (orderId: string): Promise<void> => {
    await actions.confirmOrder(orderId);
  };

  const handleStartPreparation = async (orderId: string): Promise<void> => {
    await actions.startPreparation(orderId);
  };

  const handleMarkReady = async (orderId: string, deliveryMethod?: string): Promise<void> => {
    await actions.markReady(orderId, deliveryMethod);
  };

  const handleMarkPickedUp = async (orderId: string): Promise<void> => {
    await actions.markPickedUp(orderId);
  };

  const handleMarkInDelivery = async (orderId: string): Promise<void> => {
    await actions.markInDelivery(orderId);
  };

  const handleMarkDelivered = async (orderId: string): Promise<void> => {
    await actions.markDelivered(orderId);
  };

  const handleCancelOrder = async (orderId: string, reason?: string): Promise<void> => {
    await actions.cancelOrder(orderId, reason);
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: string): Promise<void> => {
    await actions.updatePaymentStatus(orderId, status);
  };

  const value = {
    orders,
    stats,
    loading: isLoading,
    isConnected,
    isUpdating: actions.isUpdating,
    refreshData: refetch,
    updateOrderStatus: handleUpdateOrderStatus,
    confirmOrder: handleConfirmOrder,
    startPreparation: handleStartPreparation,
    markReady: handleMarkReady,
    markPickedUp: handleMarkPickedUp,
    markInDelivery: handleMarkInDelivery,
    markDelivered: handleMarkDelivered,
    cancelOrder: handleCancelOrder,
    updatePaymentStatus: handleUpdatePaymentStatus,
    autoPrintEnabled: isAutoPrintEnabled,
  };

  return (
    <AttendantContext.Provider value={value}>
      {children}
    </AttendantContext.Provider>
  );
};

export const useAttendant = () => {
  const context = useContext(AttendantContext);
  if (context === undefined) {
    throw new Error('useAttendant must be used within AttendantProvider');
  }
  return context;
};
