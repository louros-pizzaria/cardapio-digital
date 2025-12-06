// ===== HOOK PARA CONTROLE DE ESTOQUE ATÔMICO =====

import { useState, useCallback, useEffect } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { 
  atomicStockController,
  checkProductsAvailability,
  reserveProductsAtomically,
  releaseStockReservations,
  confirmStockReservations,
  getProductStock,
  getUserStockReservations,
  cleanupExpiredStockReservations,
  getStockSystemStats,
  type StockItem,
  type ProductStock,
  type StockReservation
} from '@/utils/atomicStockControl';

interface UseAtomicStockReturn {
  // Estado
  isLoading: boolean;
  error: string | null;
  userReservations: StockReservation[];
  productStock: Record<string, ProductStock>;
  systemStats: {
    totalProducts: number;
    lowStockProducts: number;
    activeReservations: number;
    totalReservedQuantity: number;
  };

  // Ações
  checkAvailability: (items: StockItem[]) => Promise<{
    success: boolean;
    availableItems: StockItem[];
    unavailableItems: { product_id: string; requested: number; available: number }[];
    errors: string[];
  }>;
  
  reserveStock: (items: StockItem[], orderKey?: string) => Promise<{
    success: boolean;
    reservations: string[];
    errors: string[];
  }>;
  
  releaseReservations: (reservationIds: string[], reason?: string) => Promise<{
    success: boolean;
    releasedCount: number;
    errors: string[];
  }>;
  
  confirmReservations: (reservationIds: string[], orderId?: string) => Promise<{
    success: boolean;
    confirmedCount: number;
    errors: string[];
  }>;

  loadProductStock: (productIds: string[]) => Promise<void>;
  loadUserReservations: (activeOnly?: boolean) => Promise<void>;
  loadSystemStats: () => Promise<void>;
  cleanupExpired: () => Promise<{ success: boolean; cleanedCount: number; error?: string }>;
  
  // Utilitários
  isProductAvailable: (productId: string, quantity: number) => boolean;
  getAvailableQuantity: (productId: string) => number;
  getTotalReservedByUser: () => number;
  clearError: () => void;
}

export const useAtomicStock = (): UseAtomicStockReturn => {
  const { user } = useUnifiedAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userReservations, setUserReservations] = useState<StockReservation[]>([]);
  const [productStock, setProductStock] = useState<Record<string, ProductStock>>({});
  const [systemStats, setSystemStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    activeReservations: 0,
    totalReservedQuantity: 0
  });

  // Verificar disponibilidade de produtos
  const checkAvailability = useCallback(async (items: StockItem[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await checkProductsAvailability(items);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar disponibilidade';
      setError(errorMessage);
      return {
        success: false,
        availableItems: [],
        unavailableItems: [],
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reservar estoque
  const reserveStock = useCallback(async (items: StockItem[], orderKey?: string) => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return { success: false, reservations: [], errors: ['Usuário não autenticado'] };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await reserveProductsAtomically(items, user.id, orderKey);
      
      // Atualizar reservas do usuário se sucesso
      if (result.success) {
        await loadUserReservations(true);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reservar estoque';
      setError(errorMessage);
      return {
        success: false,
        reservations: [],
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Liberar reservas
  const releaseReservations = useCallback(async (reservationIds: string[], reason?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await releaseStockReservations(reservationIds, reason);
      
      // Atualizar reservas do usuário se sucesso
      if (result.success) {
        await loadUserReservations(true);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao liberar reservas';
      setError(errorMessage);
      return {
        success: false,
        releasedCount: 0,
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Confirmar reservas
  const confirmReservations = useCallback(async (reservationIds: string[], orderId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await confirmStockReservations(reservationIds, orderId);
      
      // Atualizar reservas do usuário se sucesso
      if (result.success) {
        await loadUserReservations(true);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao confirmar reservas';
      setError(errorMessage);
      return {
        success: false,
        confirmedCount: 0,
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar estoque de produtos
  const loadProductStock = useCallback(async (productIds: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stock = await getProductStock(productIds);
      const stockMap = stock.reduce((acc, item) => {
        acc[item.product_id] = item;
        return acc;
      }, {} as Record<string, ProductStock>);
      
      setProductStock(prev => ({ ...prev, ...stockMap }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estoque';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar reservas do usuário
  const loadUserReservations = useCallback(async (activeOnly: boolean = true) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const reservations = await getUserStockReservations(user.id, activeOnly);
      setUserReservations(reservations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar reservas';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Carregar estatísticas do sistema
  const loadSystemStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await getStockSystemStats();
      setSystemStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Limpar reservas expiradas
  const cleanupExpired = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cleanupExpiredStockReservations();
      
      // Recarregar dados se limpeza foi bem-sucedida
      if (result.success) {
        await loadUserReservations(true);
        await loadSystemStats();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na limpeza';
      setError(errorMessage);
      return {
        success: false,
        cleanedCount: 0,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadUserReservations, loadSystemStats]);

  // Utilitários
  const isProductAvailable = useCallback((productId: string, quantity: number): boolean => {
    const stock = productStock[productId];
    return stock ? stock.available_quantity >= quantity : false;
  }, [productStock]);

  const getAvailableQuantity = useCallback((productId: string): number => {
    const stock = productStock[productId];
    return stock ? stock.available_quantity : 0;
  }, [productStock]);

  const getTotalReservedByUser = useCallback((): number => {
    return userReservations
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + r.quantity, 0);
  }, [userReservations]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carregar reservas do usuário na inicialização
  useEffect(() => {
    if (user?.id) {
      loadUserReservations(true);
    }
  }, [user?.id, loadUserReservations]);

  return {
    // Estado
    isLoading,
    error,
    userReservations,
    productStock,
    systemStats,

    // Ações
    checkAvailability,
    reserveStock,
    releaseReservations,
    confirmReservations,
    loadProductStock,
    loadUserReservations,
    loadSystemStats,
    cleanupExpired,

    // Utilitários
    isProductAvailable,
    getAvailableQuantity,
    getTotalReservedByUser,
    clearError
  };
};