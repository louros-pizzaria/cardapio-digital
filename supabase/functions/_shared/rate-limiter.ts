// ===== RATE LIMITER PARA EDGE FUNCTIONS (APRIMORADO) =====

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export class RateLimiter {
  constructor(private supabase: SupabaseClient) {}

  async check(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

    try {
      // Buscar registro atual da janela
      const { data: existingLimit } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .single();

      if (existingLimit) {
        // Verificar se excedeu o limite
        if (existingLimit.request_count >= config.maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(
              new Date(existingLimit.window_start).getTime() + 
              config.windowSeconds * 1000
            ),
          };
        }

        // Incrementar contador
        await this.supabase
          .from('rate_limits')
          .update({
            request_count: existingLimit.request_count + 1,
            updated_at: now.toISOString(),
          })
          .eq('id', existingLimit.id);

        return {
          allowed: true,
          remaining: config.maxRequests - existingLimit.request_count - 1,
          resetAt: new Date(
            new Date(existingLimit.window_start).getTime() + 
            config.windowSeconds * 1000
          ),
        };
      }

      // Criar novo registro
      await this.supabase.from('rate_limits').insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: now.toISOString(),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      };
    } catch (error) {
      console.error('[RATE-LIMITER] Error:', error);
      // Em caso de erro, permitir a requisição (fail open)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      };
    }
  }

  /**
   * Limpa registros antigos de rate limiting
   */
  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - 3600 * 1000); // 1 hora atrás
    
    try {
      const { data, error } = await this.supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', cutoff.toISOString())
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('[RATE-LIMITER] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Rate limiting baseado em IP (para endpoints públicos)
   */
  async checkByIP(
    ip: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    return this.check(`ip:${ip}`, endpoint, config);
  }
}

// Configurações padrão para diferentes endpoints
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'create-checkout': { maxRequests: 3, windowSeconds: 60 },
  'check-subscription': { maxRequests: 10, windowSeconds: 60 },
  'create-order': { maxRequests: 5, windowSeconds: 3600 }, // 5 pedidos por hora
  'create-order-pix': { maxRequests: 5, windowSeconds: 3600 },
  'create-order-card': { maxRequests: 5, windowSeconds: 3600 },
  'default': { maxRequests: 30, windowSeconds: 60 },
};
