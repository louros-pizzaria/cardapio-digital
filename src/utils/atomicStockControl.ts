// ===== SISTEMA DE ESTOQUE ATÔMICO E TRANSACIONAL =====

import { supabase } from '@/integrations/supabase/client';

interface StockItem {
  product_id: string;
  quantity: number;
}

interface ReservationResult {
  success: boolean;
  reservation_id?: string;
  message: string;
}

interface ProductStock {
  id: string;
  product_id: string;
  available_quantity: number;
  reserved_quantity: number;
  total_quantity: number;
  reorder_level: number;
}

interface StockReservation {
  id: string;
  product_id: string;
  user_id: string;
  quantity: number;
  reserved_at: string;
  expires_at: string;
  status: 'active' | 'confirmed' | 'expired' | 'cancelled';
  order_key?: string;
}

interface StockAuditLog {
  id: string;
  product_id: string;
  user_id?: string;
  action: string;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reason?: string;
  order_id?: string;
  reservation_id?: string;
  created_at: string;
}

class AtomicStockController {
  private static instance: AtomicStockController;
  
  public static getInstance(): AtomicStockController {
    if (!AtomicStockController.instance) {
      AtomicStockController.instance = new AtomicStockController();
    }
    return AtomicStockController.instance;
  }

  // Verificar disponibilidade de produtos com validação atômica
  async checkProductsAvailability(items: StockItem[]): Promise<{ 
    success: boolean; 
    availableItems: StockItem[]; 
    unavailableItems: { product_id: string; requested: number; available: number }[];
    errors: string[];
  }> {
    try {
      const productIds = items.map(item => item.product_id);
      
      // Buscar estoque atual de todos os produtos
      const { data: stockData, error } = await supabase
        .from('product_stock')
        .select('product_id, available_quantity, reserved_quantity')
        .in('product_id', productIds);

      if (error) {
        console.error('Erro ao verificar estoque:', error);
        return {
          success: false,
          availableItems: [],
          unavailableItems: [],
          errors: ['Erro interno ao verificar estoque']
        };
      }

      const availableItems: StockItem[] = [];
      const unavailableItems: { product_id: string; requested: number; available: number }[] = [];
      const errors: string[] = [];

      for (const item of items) {
        const stock = stockData?.find(s => s.product_id === item.product_id);
        
        if (!stock) {
          // Produto sem estoque cadastrado - assumir indisponível
          unavailableItems.push({
            product_id: item.product_id,
            requested: item.quantity,
            available: 0
          });
          errors.push(`Produto ${item.product_id} não encontrado no estoque`);
          continue;
        }

        if (stock.available_quantity >= item.quantity) {
          availableItems.push(item);
        } else {
          unavailableItems.push({
            product_id: item.product_id,
            requested: item.quantity,
            available: stock.available_quantity
          });
          errors.push(`Estoque insuficiente para produto ${item.product_id}. Disponível: ${stock.available_quantity}, Solicitado: ${item.quantity}`);
        }
      }

      return {
        success: unavailableItems.length === 0,
        availableItems,
        unavailableItems,
        errors
      };
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      return {
        success: false,
        availableItems: [],
        unavailableItems: [],
        errors: ['Erro interno na verificação de disponibilidade']
      };
    }
  }

  // Reservar estoque atomicamente
  async reserveStock(
    items: StockItem[], 
    userId: string, 
    orderKey?: string,
    ttlMinutes: number = 2
  ): Promise<{
    success: boolean;
    reservations: string[];
    errors: string[];
  }> {
    const reservations: string[] = [];
    const errors: string[] = [];

    try {
      // Processar cada item individualmente para garantir atomicidade
      for (const item of items) {
        const { data, error } = await supabase.rpc('atomic_reserve_stock', {
          p_product_id: item.product_id,
          p_user_id: userId,
          p_quantity: item.quantity,
          p_order_key: orderKey,
          p_ttl_minutes: ttlMinutes
        });

        if (error) {
          console.error(`Erro ao reservar produto ${item.product_id}:`, error);
          errors.push(`Erro ao reservar produto ${item.product_id}: ${error.message}`);
          continue;
        }

        const result = data?.[0] as ReservationResult;
        if (result?.success && result.reservation_id) {
          reservations.push(result.reservation_id);
        } else {
          errors.push(`Falha ao reservar produto ${item.product_id}: ${result?.message || 'Erro desconhecido'}`);
        }
      }

      // Se houve erro em alguma reserva, liberar todas as reservas bem-sucedidas
      if (errors.length > 0 && reservations.length > 0) {
        await this.releaseReservations(reservations, 'Rollback devido a erro parcial');
        return {
          success: false,
          reservations: [],
          errors
        };
      }

      return {
        success: reservations.length === items.length,
        reservations,
        errors
      };
    } catch (error) {
      console.error('Erro na reserva de estoque:', error);
      
      // Liberar reservas em caso de erro
      if (reservations.length > 0) {
        await this.releaseReservations(reservations, 'Rollback devido a exceção');
      }

      return {
        success: false,
        reservations: [],
        errors: ['Erro interno na reserva de estoque']
      };
    }
  }

  // Liberar múltiplas reservas
  async releaseReservations(reservationIds: string[], reason: string = 'Manual release'): Promise<{
    success: boolean;
    releasedCount: number;
    errors: string[];
  }> {
    let releasedCount = 0;
    const errors: string[] = [];

    try {
      for (const reservationId of reservationIds) {
        const { data, error } = await supabase.rpc('atomic_release_stock', {
          p_reservation_id: reservationId,
          p_reason: reason
        });

        if (error) {
          console.error(`Erro ao liberar reserva ${reservationId}:`, error);
          errors.push(`Erro ao liberar reserva ${reservationId}: ${error.message}`);
          continue;
        }

        const result = data?.[0] as { success: boolean; message: string };
        if (result?.success) {
          releasedCount++;
        } else {
          errors.push(`Falha ao liberar reserva ${reservationId}: ${result?.message || 'Erro desconhecido'}`);
        }
      }

      return {
        success: releasedCount === reservationIds.length,
        releasedCount,
        errors
      };
    } catch (error) {
      console.error('Erro ao liberar reservas:', error);
      return {
        success: false,
        releasedCount,
        errors: ['Erro interno na liberação de reservas']
      };
    }
  }

  // Confirmar reservas (converter em venda)
  async confirmReservations(reservationIds: string[], orderId?: string): Promise<{
    success: boolean;
    confirmedCount: number;
    errors: string[];
  }> {
    let confirmedCount = 0;
    const errors: string[] = [];

    try {
      for (const reservationId of reservationIds) {
        const { data, error } = await supabase.rpc('atomic_confirm_stock', {
          p_reservation_id: reservationId,
          p_order_id: orderId
        });

        if (error) {
          console.error(`Erro ao confirmar reserva ${reservationId}:`, error);
          errors.push(`Erro ao confirmar reserva ${reservationId}: ${error.message}`);
          continue;
        }

        const result = data?.[0] as { success: boolean; message: string };
        if (result?.success) {
          confirmedCount++;
        } else {
          errors.push(`Falha ao confirmar reserva ${reservationId}: ${result?.message || 'Erro desconhecido'}`);
        }
      }

      return {
        success: confirmedCount === reservationIds.length,
        confirmedCount,
        errors
      };
    } catch (error) {
      console.error('Erro ao confirmar reservas:', error);
      return {
        success: false,
        confirmedCount,
        errors: ['Erro interno na confirmação de reservas']
      };
    }
  }

  // Buscar estoque de produtos
  async getProductStock(productIds: string[]): Promise<ProductStock[]> {
    try {
      const { data, error } = await supabase
        .from('product_stock')
        .select('*')
        .in('product_id', productIds);

      if (error) {
        console.error('Erro ao buscar estoque:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      return [];
    }
  }

  // Buscar reservas do usuário
  async getUserReservations(userId: string, activeOnly: boolean = true): Promise<StockReservation[]> {
    try {
      let query = supabase
        .from('stock_reservations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('status', 'active');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar reservas:', error);
        return [];
      }

      return (data || []) as StockReservation[];
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      return [];
    }
  }

  // Buscar logs de auditoria
  async getAuditLogs(productId?: string, limit: number = 50): Promise<StockAuditLog[]> {
    try {
      let query = supabase
        .from('stock_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return [];
    }
  }

  // Executar limpeza manual de reservas expiradas
  async cleanupExpiredReservations(): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_stock_reservations');

      if (error) {
        console.error('Erro na limpeza de reservas:', error);
        return {
          success: false,
          cleanedCount: 0,
          error: error.message
        };
      }

      return {
        success: true,
        cleanedCount: data || 0
      };
    } catch (error) {
      console.error('Erro na limpeza de reservas:', error);
      return {
        success: false,
        cleanedCount: 0,
        error: 'Erro interno na limpeza'
      };
    }
  }

  // Estatísticas do sistema
  async getStockStats(): Promise<{
    totalProducts: number;
    lowStockProducts: number;
    activeReservations: number;
    totalReservedQuantity: number;
  }> {
    try {
      const [stockData, reservationsData] = await Promise.all([
        supabase
          .from('product_stock')
          .select('available_quantity, reserved_quantity, reorder_level'),
        supabase
          .from('stock_reservations')
          .select('quantity')
          .eq('status', 'active')
      ]);

      const stock = stockData.data || [];
      const reservations = reservationsData.data || [];

      return {
        totalProducts: stock.length,
        lowStockProducts: stock.filter(s => s.available_quantity <= s.reorder_level).length,
        activeReservations: reservations.length,
        totalReservedQuantity: reservations.reduce((sum, r) => sum + r.quantity, 0)
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        totalProducts: 0,
        lowStockProducts: 0,
        activeReservations: 0,
        totalReservedQuantity: 0
      };
    }
  }
}

// Instância global
export const atomicStockController = AtomicStockController.getInstance();

// Utilitários de conveniência
export const checkProductsAvailability = (items: StockItem[]) => 
  atomicStockController.checkProductsAvailability(items);

export const reserveProductsAtomically = (items: StockItem[], userId: string, orderKey?: string) =>
  atomicStockController.reserveStock(items, userId, orderKey);

export const releaseStockReservations = (reservationIds: string[], reason?: string) =>
  atomicStockController.releaseReservations(reservationIds, reason);

export const confirmStockReservations = (reservationIds: string[], orderId?: string) =>
  atomicStockController.confirmReservations(reservationIds, orderId);

export const getProductStock = (productIds: string[]) =>
  atomicStockController.getProductStock(productIds);

export const getUserStockReservations = (userId: string, activeOnly?: boolean) =>
  atomicStockController.getUserReservations(userId, activeOnly);

export const getStockAuditLogs = (productId?: string, limit?: number) =>
  atomicStockController.getAuditLogs(productId, limit);

export const cleanupExpiredStockReservations = () =>
  atomicStockController.cleanupExpiredReservations();

export const getStockSystemStats = () =>
  atomicStockController.getStockStats();

export type { StockItem, ReservationResult, ProductStock, StockReservation, StockAuditLog };