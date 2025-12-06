// ===== RATE LIMITING E CONTROLE DE FREQUÊNCIA (APRIMORADO FASE 1) =====

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime <= now) {
        this.storage.delete(key);
      }
    }
  }

  public isAllowed(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || entry.resetTime <= now) {
      // Primeira requisição ou janela expirada
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      console.warn(`[RateLimit] Limite excedido para ${identifier}`);
      return false;
    }

    entry.count++;
    return true;
  }

  public check(identifier: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || entry.resetTime <= now) {
      // Primeira requisição ou janela expirada
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }

  public getRemainingTime(identifier: string): number {
    const entry = this.storage.get(identifier);
    if (!entry) return 0;
    
    const remaining = entry.resetTime - Date.now();
    return Math.max(0, remaining);
  }

  public reset(identifier: string) {
    this.storage.delete(identifier);
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

// Instância global para rate limiting
export const rateLimiter = new RateLimiter();

// Constantes de rate limiting para alta concorrência
export const RATE_LIMITS = {
  ORDERS_PER_HOUR: 100, // Aumentado para alta concorrência
  ORDERS_PER_HOUR_VIP: 200 as const, // Limite dobrado para usuários VIP
  ORDERS_PER_HOUR_PEAK: 150 as const, // Limite específico para horários de pico
  REGISTRATION_PER_IP: 10, // Aumentado para evitar bloqueios legítimos
  LOGIN_ATTEMPTS: 15, // Mais tentativas para clientes legítimos
  PASSWORD_RESET: 5,
  PAYMENT_ATTEMPTS: 8, // Mais tentativas para pagamentos
  CHECKOUT_CLICKS: 50, // Mais cliques por minuto para alta demanda
  CONCURRENT_ORDERS: 10, // Aumentado para permitir múltiplos pedidos simultâneos
  MAX_PROCESSING_CONCURRENT: 5 // Novo: limita processamento simultâneo global
} as const;

// Horários de pico (formato 24h)
export const PEAK_HOURS = {
  START: 18, // 18:00
  END: 22   // 22:00
} as const;

// Verificar se está em horário de pico
export const isPeakHour = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= PEAK_HOURS.START && hour <= PEAK_HOURS.END;
};

// Utilitários para diferentes tipos de rate limiting
export const checkOrderRateLimit = (userId: string, isVip: boolean = false): boolean => {
  const isPeak = isPeakHour();
  let limit = 100; // RATE_LIMITS.ORDERS_PER_HOUR
  
  if (isVip) {
    limit = 200; // RATE_LIMITS.ORDERS_PER_HOUR_VIP
  } else if (isPeak) {
    limit = 150; // RATE_LIMITS.ORDERS_PER_HOUR_PEAK
  }
  
  return rateLimiter.isAllowed(
    `order:${userId}`, 
    limit, 
    60 * 60 * 1000 // 1 hora
  );
};

export const checkConcurrentOrderLimit = (userId: string): boolean => {
  return rateLimiter.isAllowed(
    `concurrent:${userId}`, 
    RATE_LIMITS.CONCURRENT_ORDERS, 
    5 * 60 * 1000 // 5 minutos
  );
};

export const checkRegistrationRateLimit = (ip: string): boolean => {
  return rateLimiter.isAllowed(
    `register:${ip}`, 
    RATE_LIMITS.REGISTRATION_PER_IP, 
    60 * 60 * 1000 // 1 hora
  );
};

export const checkLoginRateLimit = (identifier: string): boolean => {
  return rateLimiter.isAllowed(
    `login:${identifier}`, 
    RATE_LIMITS.LOGIN_ATTEMPTS, 
    15 * 60 * 1000 // 15 minutos
  );
};

export const checkPaymentRateLimit = (userId: string): boolean => {
  return rateLimiter.isAllowed(
    `payment:${userId}`, 
    RATE_LIMITS.PAYMENT_ATTEMPTS, 
    15 * 60 * 1000 // 15 minutos
  );
};

export const checkCheckoutRateLimit = (userId: string): boolean => {
  return rateLimiter.isAllowed(
    `checkout:${userId}`, 
    RATE_LIMITS.CHECKOUT_CLICKS, 
    60 * 1000 // 1 minuto
  );
};

// Novo: Controle de processamento simultâneo global
export const checkGlobalProcessingLimit = (): boolean => {
  return rateLimiter.isAllowed(
    'global:processing',
    RATE_LIMITS.MAX_PROCESSING_CONCURRENT,
    30 * 1000 // 30 segundos
  );
};