// ===== WEBHOOK RATE LIMITER - FASE 1 SEGURANÇA =====
// Previne ataques de DDoS em webhooks

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const WEBHOOK_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'stripe': { maxRequests: 100, windowSeconds: 60 }, // 100 req/min
  'mercadopago': { maxRequests: 100, windowSeconds: 60 },
  'default': { maxRequests: 50, windowSeconds: 60 }
};

export async function checkWebhookRateLimit(
  supabase: SupabaseClient,
  webhookType: string,
  identifier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = WEBHOOK_RATE_LIMITS[webhookType] || WEBHOOK_RATE_LIMITS.default;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  try {
    // Check existing rate limit
    const { data: existingLimit } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', `webhook:${webhookType}:${identifier}`)
      .eq('endpoint', `webhook-${webhookType}`)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (existingLimit) {
      if (existingLimit.request_count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(
            new Date(existingLimit.window_start).getTime() + 
            config.windowSeconds * 1000
          )
        };
      }

      // Increment counter
      await supabase
        .from('rate_limits')
        .update({
          request_count: existingLimit.request_count + 1,
          updated_at: now.toISOString()
        })
        .eq('id', existingLimit.id);

      return {
        allowed: true,
        remaining: config.maxRequests - existingLimit.request_count - 1,
        resetAt: new Date(
          new Date(existingLimit.window_start).getTime() + 
          config.windowSeconds * 1000
        )
      };
    }

    // Create new rate limit record
    await supabase.from('rate_limits').insert({
      identifier: `webhook:${webhookType}:${identifier}`,
      endpoint: `webhook-${webhookType}`,
      request_count: 1,
      window_start: now.toISOString()
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
    };
  } catch (error) {
    console.error('[WEBHOOK-RATE-LIMITER] Error:', error);
    // Fail open in case of errors
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
    };
  }
}
