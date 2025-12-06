// ===== SISTEMA DE IDEMPOTÊNCIA PARA PEDIDOS =====

interface IdempotencyEntry {
  result: any;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
}

class IdempotencyManager {
  private cache: Map<string, IdempotencyEntry> = new Map();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutos
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.cache.delete(key);
      }
    }
  }

  // Gerar chave de idempotência
  generateKey(data: any): string {
    // Normalizar dados para gerar chave consistente
    const normalized = {
      user_id: data.user_id,
      items: data.items?.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        customizations: this.normalizeCustomizations(item.customizations)
      })).sort((a: any, b: any) => a.product_id.localeCompare(b.product_id)),
      total_amount: data.total_amount,
      payment_method: data.payment_method,
      delivery_method: data.delivery_method,
      // Window de tempo de 30 segundos para considerar como mesmo pedido
      time_window: Math.floor(Date.now() / 30000)
    };

    return btoa(JSON.stringify(normalized));
  }

  private normalizeCustomizations(customizations: any): any {
    if (!customizations) return null;
    
    // Ordenar arrays para garantir consistência
    const normalized = { ...customizations };
    
    if (normalized.extras) {
      normalized.extras = [...normalized.extras].sort();
    }
    
    return normalized;
  }

  // Verificar se operação já está em andamento
  isProcessing(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? entry.status === 'processing' : false;
  }

  // Verificar se operação já foi completada
  getResult(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && entry.status === 'completed') {
      return entry.result;
    }
    return null;
  }

  // Marcar operação como em processamento
  markAsProcessing(key: string): void {
    this.cache.set(key, {
      result: null,
      timestamp: Date.now(),
      status: 'processing'
    });
  }

  // Marcar operação como completada
  markAsCompleted(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      status: 'completed'
    });
  }

  // Marcar operação como falhada
  markAsFailed(key: string): void {
    this.cache.set(key, {
      result: null,
      timestamp: Date.now(),
      status: 'failed'
    });
  }

  // Executar operação com proteção de idempotência
  async executeIdempotent<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Verificar se já existe resultado
    const existingResult = this.getResult(key);
    if (existingResult) {
      console.log('[IDEMPOTENCY] Returning cached result for key:', key.slice(0, 10) + '...');
      return existingResult;
    }

    // Verificar se já está processando
    if (this.isProcessing(key)) {
      throw new Error('Operation already in progress');
    }

    // Marcar como processando
    this.markAsProcessing(key);

    try {
      // Executar operação
      const result = await operation();
      
      // Marcar como completada
      this.markAsCompleted(key, result);
      
      return result;
    } catch (error) {
      // Marcar como falhada
      this.markAsFailed(key);
      throw error;
    }
  }

  // Limpar cache manualmente
  clear(): void {
    this.cache.clear();
  }

  // Destruir manager
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  // Obter estatísticas
  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      total: entries.length,
      processing: entries.filter(e => e.status === 'processing').length,
      completed: entries.filter(e => e.status === 'completed').length,
      failed: entries.filter(e => e.status === 'failed').length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null
    };
  }
}

// Instância global
export const idempotencyManager = new IdempotencyManager();

// Utilitários para diferentes tipos de operações
export const createOrderIdempotentKey = (orderData: any): string => {
  return `order:${idempotencyManager.generateKey(orderData)}`;
};

export const createPaymentIdempotentKey = (paymentData: any): string => {
  return `payment:${idempotencyManager.generateKey(paymentData)}`;
};

// Hook para usar idempotência em componentes React
export const useIdempotency = () => {
  return {
    generateKey: idempotencyManager.generateKey.bind(idempotencyManager),
    executeIdempotent: idempotencyManager.executeIdempotent.bind(idempotencyManager),
    isProcessing: idempotencyManager.isProcessing.bind(idempotencyManager),
    getResult: idempotencyManager.getResult.bind(idempotencyManager),
    getStats: idempotencyManager.getStats.bind(idempotencyManager)
  };
};