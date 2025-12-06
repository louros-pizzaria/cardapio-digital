// ===== HOOK ADMIN ORDERS OTIMIZADO - WRAPPER REFATORADO (FASE 2.4) =====
// Este hook agora compõe 3 hooks menores para manter a mesma API pública
// Benefícios da refatoração:
// - Código mais modular e testável
// - Responsabilidades bem definidas
// - Reutilização de lógica (ex: Realtime pode ser usado em outros contextos)

import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useAdminOrdersQuery } from './admin/useAdminOrdersQuery';
import { useAdminOrdersRealtime } from './admin/useAdminOrdersRealtime';
import { useAdminOrdersActions } from './admin/useAdminOrdersActions';

// Re-export types
export type { AdminOrder } from './admin/useAdminOrdersQuery';

interface UseAdminOrdersOptions {
  status?: string;
  limit?: number;
  enableRealtime?: boolean;
}

/**
 * Hook unificado para gerenciar pedidos admin
 * Mantém a mesma API pública para compatibilidade
 * 
 * @example
 * const { orders, isLoading, confirmOrder, updateOrderStatus } = useAdminOrdersOptimized({
 *   status: 'pending',
 *   limit: 50,
 *   enableRealtime: true
 * });
 */
export const useAdminOrdersOptimized = (options: UseAdminOrdersOptions = {}) => {
  const { user } = useUnifiedAuth();
  const { status, limit = 50, enableRealtime = true } = options;

  // 1. Query hook - buscar dados
  const query = useAdminOrdersQuery({ 
    status, 
    limit, 
    userId: user?.id 
  });

  // 2. Realtime hook - sincronização em tempo real
  const { isConnected } = useAdminOrdersRealtime({
    queryKey: query.queryKey,
    enabled: enableRealtime,
    userId: user?.id,
  });

  // 3. Actions hook - ações de update
  const actions = useAdminOrdersActions({
    queryKey: query.queryKey,
  });

  // Retornar API unificada (mesma interface pública)
  return {
    // Data
    orders: query.orders,
    isLoading: query.isLoading,
    error: query.error,
    
    // Status
    isConnected,
    
    // Methods
    refreshOrders: query.refreshOrders,
    updateOrderStatus: actions.updateOrderStatus,
    confirmOrder: actions.confirmOrder,
    startPreparing: actions.startPreparing,
    markReady: actions.markReady,
    markInDelivery: actions.markInDelivery,
    markDelivered: actions.markDelivered,
    cancelOrder: actions.cancelOrder,
  };
};
