// ===== CONTROLE DE CONCORRÊNCIA E SEMÁFOROS =====

interface SemaphoreEntry {
  acquired: number;
  waiting: Array<{
    resolve: (value: () => void) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
}

class ConcurrencyManager {
  private semaphores: Map<string, SemaphoreEntry> = new Map();
  private locks: Map<string, { locked: boolean; expiry: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpeza automática a cada 30 segundos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    
    // Limpar locks expirados
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiry <= now) {
        this.locks.delete(key);
      }
    }
    
    // Limpar semáforos sem uso
    for (const [key, semaphore] of this.semaphores.entries()) {
      if (semaphore.acquired === 0 && semaphore.waiting.length === 0) {
        this.semaphores.delete(key);
      }
    }
  }

  // Semáforo para controlar número de operações simultâneas
  public async acquireSemaphore(
    key: string, 
    maxConcurrent: number = 5, 
    timeoutMs: number = 60000
  ): Promise<() => void> {
    const semaphore = this.semaphores.get(key) || { acquired: 0, waiting: [] };
    this.semaphores.set(key, semaphore);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remover da fila de espera
        const index = semaphore.waiting.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          semaphore.waiting.splice(index, 1);
        }
        reject(new Error(`Timeout waiting for semaphore: ${key}`));
      }, timeoutMs);

      const tryAcquire = () => {
        if (semaphore.acquired < maxConcurrent) {
          semaphore.acquired++;
          clearTimeout(timeout);
          
          // Retornar função de release
          const releaseFunction = () => {
            semaphore.acquired = Math.max(0, semaphore.acquired - 1);
            
            // Processar próximo na fila
            if (semaphore.waiting.length > 0) {
              const next = semaphore.waiting.shift()!;
              clearTimeout(next.timeout);
              setImmediate(() => tryAcquire());
            }
          };
          resolve(releaseFunction);
        } else {
          // Adicionar à fila de espera
          semaphore.waiting.push({ resolve, reject, timeout });
        }
      };

      tryAcquire();
    });
  }

  // Lock distributivo simples
  public async acquireLock(
    key: string, 
    ttlMs: number = 30000,
    retryIntervalMs: number = 100,
    maxRetries: number = 300
  ): Promise<() => void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      const now = Date.now();
      const lock = this.locks.get(key);
      
      if (!lock || lock.expiry <= now) {
        // Adquirir lock
        this.locks.set(key, {
          locked: true,
          expiry: now + ttlMs
        });
        
        // Retornar função de release
        return () => {
          this.locks.delete(key);
        };
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
      retries++;
    }
    
    throw new Error(`Failed to acquire lock: ${key} after ${maxRetries} retries`);
  }

  // Verificar se operação está em andamento
  public isLocked(key: string): boolean {
    const lock = this.locks.get(key);
    return lock ? lock.expiry > Date.now() : false;
  }

  // Estatísticas do sistema
  public getStats() {
    return {
      activeSemaphores: this.semaphores.size,
      activeLocks: this.locks.size,
      totalWaiting: Array.from(this.semaphores.values())
        .reduce((sum, sem) => sum + sem.waiting.length, 0),
      totalAcquired: Array.from(this.semaphores.values())
        .reduce((sum, sem) => sum + sem.acquired, 0)
    };
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Limpar todas as operações pendentes
    for (const semaphore of this.semaphores.values()) {
      for (const waiting of semaphore.waiting) {
        clearTimeout(waiting.timeout);
        waiting.reject(new Error('Concurrency manager destroyed'));
      }
    }
    
    this.semaphores.clear();
    this.locks.clear();
  }
}

// Instância global
export const concurrencyManager = new ConcurrencyManager();

// Utilitários específicos para pedidos
export const acquireOrderProcessingLock = async (orderId: string): Promise<() => void> => {
  return concurrencyManager.acquireLock(`order:${orderId}`, 60000); // 1 minuto
};

export const acquireUserOrderSemaphore = async (userId: string): Promise<() => void> => {
  return concurrencyManager.acquireSemaphore(`user:${userId}`, 3, 30000); // Max 3 pedidos simultâneos por usuário
};

export const acquireGlobalOrderSemaphore = async (): Promise<() => void> => {
  return concurrencyManager.acquireSemaphore('global:orders', 20, 45000); // Max 20 pedidos simultâneos globalmente
};

export const isOrderBeingProcessed = (orderId: string): boolean => {
  return concurrencyManager.isLocked(`order:${orderId}`);
};

// Hook React para usar o controle de concorrência
export const useConcurrencyControl = () => {
  return {
    acquireOrderProcessingLock,
    acquireUserOrderSemaphore,
    acquireGlobalOrderSemaphore,
    isOrderBeingProcessed,
    getStats: () => concurrencyManager.getStats()
  };
};