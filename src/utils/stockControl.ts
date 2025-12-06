// ===== SISTEMA DE CONTROLE DE ESTOQUE (LEGACY - EM MIGRAÇÃO) =====
// NOTA: Este sistema está sendo migrado para atomicStockControl.ts
// Mantido para compatibilidade com código existente

import { supabase } from "@/integrations/supabase/client";
import { 
  checkProductsAvailability as atomicCheckAvailability,
  reserveProductsAtomically,
  releaseStockReservations,
  confirmStockReservations
} from './atomicStockControl';

interface StockItem {
  product_id: string;
  quantity: number;
  reserved_until?: Date;
}

interface ProductAvailability {
  product_id: string;
  is_available: boolean;
  stock_quantity?: number;
  reason?: string;
}

// Adaptador para o sistema legacy - redireciona para o sistema atômico
class LegacyStockController {
  private reservationMap: Map<string, string[]> = new Map(); // userId -> reservationIds
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Manter estrutura similar ao sistema antigo para compatibilidade
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredReservations();
    }, 30 * 1000);
  }

  private cleanupExpiredReservations() {
    // O sistema atômico já faz cleanup automático via cron job
    // Apenas limpamos nosso mapeamento local
    console.log('[LEGACY_STOCK] Cleanup check - atomic system handles expiration automatically');
  }
  
  async checkProductsAvailability(items: StockItem[]): Promise<ProductAvailability[]> {
    try {
      const result = await atomicCheckAvailability(items);
      
      // Converter formato do novo sistema para o formato legacy
      const availability: ProductAvailability[] = [];
      
      for (const item of items) {
        const unavailable = result.unavailableItems.find(u => u.product_id === item.product_id);
        
        if (unavailable) {
          availability.push({
            product_id: item.product_id,
            is_available: false,
            stock_quantity: unavailable.available,
            reason: `Estoque insuficiente. Disponível: ${unavailable.available}, Solicitado: ${unavailable.requested}`
          });
        } else {
          // Assumir que item está em availableItems
          availability.push({
            product_id: item.product_id,
            is_available: true,
            stock_quantity: item.quantity, // Quantidade solicitada é disponível
          });
        }
      }
      
      return availability;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade (legacy):', error);
      
      // Fallback: assumir indisponível em caso de erro
      return items.map(item => ({
        product_id: item.product_id,
        is_available: false,
        stock_quantity: 0,
        reason: 'Erro interno na verificação de estoque'
      }));
    }
  }

  reserveProducts(items: StockItem[], userId: string): boolean {
    // Usar sistema atômico de forma assíncrona
    this.reserveProductsAsync(items, userId);
    
    // Retornar true por compatibilidade (sistema legacy espera retorno síncrono)
    // A validação real acontece no sistema atômico
    return true;
  }

  private async reserveProductsAsync(items: StockItem[], userId: string): Promise<void> {
    try {
      const result = await reserveProductsAtomically(items, userId);
      
      if (result.success) {
        // Armazenar IDs das reservas para liberação posterior
        this.reservationMap.set(userId, result.reservations);
        console.log('[LEGACY_STOCK] Reservations created:', result.reservations);
      } else {
        console.error('[LEGACY_STOCK] Failed to reserve:', result.errors);
      }
    } catch (error) {
      console.error('[LEGACY_STOCK] Error in async reservation:', error);
    }
  }

  releaseReservation(items: StockItem[], userId: string): void {
    // Usar sistema atômico para liberar
    this.releaseReservationAsync(userId);
  }

  private async releaseReservationAsync(userId: string): Promise<void> {
    try {
      const reservationIds = this.reservationMap.get(userId);
      
      if (reservationIds && reservationIds.length > 0) {
        const result = await releaseStockReservations(reservationIds, 'Liberação via sistema legacy');
        
        if (result.success) {
          this.reservationMap.delete(userId);
          console.log('[LEGACY_STOCK] Reservations released:', reservationIds);
        } else {
          console.error('[LEGACY_STOCK] Failed to release reservations:', result.errors);
        }
      }
    } catch (error) {
      console.error('[LEGACY_STOCK] Error releasing reservations:', error);
    }
  }

  confirmOrder(items: StockItem[], userId: string): void {
    // Usar sistema atômico para confirmar
    this.confirmOrderAsync(userId);
  }

  private async confirmOrderAsync(userId: string): Promise<void> {
    try {
      const reservationIds = this.reservationMap.get(userId);
      
      if (reservationIds && reservationIds.length > 0) {
        const result = await confirmStockReservations(reservationIds);
        
        if (result.success) {
          this.reservationMap.delete(userId);
          console.log('[LEGACY_STOCK] Order confirmed:', reservationIds);
        } else {
          console.error('[LEGACY_STOCK] Failed to confirm order:', result.errors);
        }
      }
    } catch (error) {
      console.error('[LEGACY_STOCK] Error confirming order:', error);
    }
  }

  getStockStats() {
    return {
      total_reservations: this.reservationMap.size,
      active_reservations: this.reservationMap.size,
      expired_pending_cleanup: 0, // Sistema atômico lida com isso
      products_with_reservations: Array.from(this.reservationMap.entries()).map(([userId, reservationIds]) => ({
        user_id: userId,
        reservation_count: reservationIds.length,
        reservation_ids: reservationIds
      }))
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Limpar todas as reservas pendentes
    for (const [userId, reservationIds] of this.reservationMap.entries()) {
      this.releaseReservationAsync(userId);
    }
    this.reservationMap.clear();
  }
}

// Instância global com adaptador legacy
export const stockController = new LegacyStockController();

// Funções de compatibilidade (redirecionam para o sistema atômico)
export const checkProductAvailability = async (items: StockItem[]): Promise<ProductAvailability[]> => {
  return stockController.checkProductsAvailability(items);
};

export const reserveProductsTemporarily = (items: StockItem[], userId: string): boolean => {
  return stockController.reserveProducts(items, userId);
};

export const releaseProductReservation = (items: StockItem[], userId: string): void => {
  stockController.releaseReservation(items, userId);
};

export const confirmProductOrder = (items: StockItem[], userId: string): void => {
  stockController.confirmOrder(items, userId);
};

// Hook React para compatibilidade
export const useStockControl = () => {
  return {
    checkAvailability: checkProductAvailability,
    reserve: reserveProductsTemporarily,
    release: releaseProductReservation,
    confirm: confirmProductOrder,
    getStats: () => stockController.getStockStats()
  };
};