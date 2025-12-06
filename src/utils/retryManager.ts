// ===== SISTEMA DE RETRY COM BACKOFF EXPONENCIAL =====

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

class RetryManager {
  private static defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: () => true,
    onRetry: () => {}
  };

  // Executar função com retry automático
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: any;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Verificar se deve tentar novamente
        if (attempt === opts.maxRetries || !opts.retryCondition(error)) {
          throw error;
        }
        
        // Callback de retry
        opts.onRetry(attempt + 1, error);
        
        // Calcular delay com backoff exponencial
        const delay = this.calculateDelay(attempt, opts);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  // Calcular delay com backoff exponencial e jitter
  private static calculateDelay(attempt: number, opts: Required<RetryOptions>): number {
    let delay = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt);
    
    // Aplicar limite máximo
    delay = Math.min(delay, opts.maxDelayMs);
    
    // Adicionar jitter para evitar thundering herd
    if (opts.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Condições de retry específicas
  public static retryConditions = {
    // Retry para erros de rede e timeouts
    networkErrors: (error: any): boolean => {
      const networkErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
      const httpRetryCodes = [408, 429, 500, 502, 503, 504];
      
      return (
        networkErrorCodes.includes(error.code) ||
        httpRetryCodes.includes(error.status) ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection')
      );
    },
    
    // Retry para erros de concorrência
    concurrencyErrors: (error: any): boolean => {
      const concurrencyMessages = [
        'lock timeout',
        'semaphore timeout',
        'rate limit',
        'too many connections',
        'resource busy'
      ];
      
      return concurrencyMessages.some(msg => 
        error.message?.toLowerCase().includes(msg)
      );
    },
    
    // Retry para erros de banco de dados temporários
    databaseErrors: (error: any): boolean => {
      const dbErrorCodes = ['40001', '40P01', '08000', '08003', '08006'];
      const dbMessages = [
        'serialization failure',
        'deadlock detected',
        'connection failure',
        'server closed unexpectedly'
      ];
      
      return (
        dbErrorCodes.includes(error.code) ||
        dbMessages.some(msg => error.message?.toLowerCase().includes(msg))
      );
    },
    
    // Combinação de todas as condições
    allRetryable: (error: any): boolean => {
      return (
        RetryManager.retryConditions.networkErrors(error) ||
        RetryManager.retryConditions.concurrencyErrors(error) ||
        RetryManager.retryConditions.databaseErrors(error)
      );
    }
  };
}

// Utilitários específicos para operações de pedidos
export const retryOrderOperation = async <T>(
  operation: () => Promise<T>,
  context: string = 'order'
): Promise<T> => {
  return RetryManager.executeWithRetry(operation, {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    retryCondition: RetryManager.retryConditions.allRetryable,
    onRetry: (attempt, error) => {
      console.warn(`Retry ${attempt} for ${context}:`, error.message);
    }
  });
};

export const retryPaymentOperation = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return RetryManager.executeWithRetry(operation, {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    retryCondition: RetryManager.retryConditions.networkErrors,
    onRetry: (attempt, error) => {
      console.warn(`Payment retry ${attempt}:`, error.message);
    }
  });
};

export const retryDatabaseOperation = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return RetryManager.executeWithRetry(operation, {
    maxRetries: 4,
    baseDelayMs: 500,
    maxDelayMs: 8000,
    retryCondition: RetryManager.retryConditions.databaseErrors,
    onRetry: (attempt, error) => {
      console.warn(`Database retry ${attempt}:`, error.message);
    }
  });
};

// Hook React para usar o retry manager
export const useRetryManager = () => {
  return {
    retryOrderOperation,
    retryPaymentOperation,
    retryDatabaseOperation,
    executeWithRetry: RetryManager.executeWithRetry,
    retryConditions: RetryManager.retryConditions
  };
};

export { RetryManager };