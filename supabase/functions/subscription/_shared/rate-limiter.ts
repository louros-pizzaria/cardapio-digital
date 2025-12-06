// ===== RATE LIMITER PARA EDGE FUNCTIONS =====

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export class RateLimiter {
  constructor(private supabase: SupabaseClient) {}

  async check(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);
    const cacheKey = `rate_limit_${identifier}_${Math.floor(now.getTime() / (windowSeconds * 1000))}`;

    try {
      // Check cache first (stored in a hypothetical rate_limits table)
      // For now, we'll use a simple in-memory approach
      // In production, consider using Redis or a dedicated table
      
      // Query recent requests from security_logs or a dedicated rate_limit table
      const { data, error } = await this.supabase
        .from('security_logs')
        .select('id')
        .eq('user_id', identifier)
        .gte('created_at', windowStart.toISOString())
        .limit(maxRequests + 1);

      if (error) {
        console.error('[RATE-LIMITER] Error checking rate limit:', error);
        // On error, allow request but log it
        return true;
      }

      const requestCount = data?.length || 0;
      const allowed = requestCount < maxRequests;

      if (!allowed) {
        console.warn('[RATE-LIMITER] Rate limit exceeded', {
          identifier,
          count: requestCount,
          limit: maxRequests,
          window: windowSeconds
        });

        // Log rate limit event
        await this.supabase.from('security_logs').insert({
          user_id: identifier,
          action: 'rate_limit_exceeded',
          details: {
            count: requestCount,
            limit: maxRequests,
            window: windowSeconds
          }
        });
      }

      return allowed;
    } catch (error) {
      console.error('[RATE-LIMITER] Exception:', error);
      return true; // Fail open
    }
  }
}
