// ===== SISTEMA DE DEBOUNCE PARA AUTENTICAÇÃO =====

interface DebounceConfig {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

class AuthDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private lastCalls = new Map<string, number>();
  private pendingPromises = new Map<string, Promise<any>>();

  // Debounce function calls to prevent spam
  debounce<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T,
    config: DebounceConfig = { delay: 1000 }
  ): T {
    return ((...args: any[]) => {
      const now = Date.now();
      const lastCall = this.lastCalls.get(key) || 0;
      const timeSinceLastCall = now - lastCall;

      // If we have a pending promise for this key, return it
      if (this.pendingPromises.has(key)) {
        console.log(`[DEBOUNCER] Reusing pending promise for ${key}`);
        return this.pendingPromises.get(key)!;
      }

      // Check if we should skip this call (too frequent)
      if (timeSinceLastCall < config.delay && !config.leading) {
        console.log(`[DEBOUNCER] Skipping ${key} - too frequent (${timeSinceLastCall}ms < ${config.delay}ms)`);
        return Promise.resolve();
      }

      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Create new promise
      const promise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(async () => {
          this.lastCalls.set(key, Date.now());
          this.timers.delete(key);
          
          try {
            console.log(`[DEBOUNCER] Executing ${key}`);
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.pendingPromises.delete(key);
          }
        }, config.trailing === false ? 0 : config.delay);

        this.timers.set(key, timer);
      });

      this.pendingPromises.set(key, promise);
      return promise;
    }) as T;
  }

  // Throttle function calls (limit frequency)
  throttle<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T,
    limit: number
  ): T {
    return ((...args: any[]) => {
      const now = Date.now();
      const lastCall = this.lastCalls.get(key) || 0;
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall < limit) {
        console.log(`[THROTTLER] Throttling ${key} - ${timeSinceLastCall}ms < ${limit}ms`);
        return Promise.resolve();
      }

      this.lastCalls.set(key, now);
      return fn(...args);
    }) as T;
  }

  // Clear all timers and pending promises
  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.lastCalls.clear();
    this.pendingPromises.clear();
  }

  // Clear specific key
  clearKey(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.lastCalls.delete(key);
    this.pendingPromises.delete(key);
  }

  // Get status for debugging
  getStatus(): Record<string, any> {
    return {
      activeTimers: Array.from(this.timers.keys()),
      lastCalls: Object.fromEntries(this.lastCalls.entries()),
      pendingPromises: Array.from(this.pendingPromises.keys())
    };
  }
}

// Singleton instance
export const authDebouncer = new AuthDebouncer();

// Specific debouncers for auth operations
export const debouncedSubscriptionCheck = authDebouncer.debounce(
  'subscription_check',
  async (fn: () => Promise<any>) => fn(),
  { delay: 2000, trailing: true }
);

export const throttledProfileFetch = authDebouncer.throttle(
  'profile_fetch',
  async (fn: () => Promise<any>) => fn(),
  3000 // Max once every 3 seconds
);

export const debouncedLogout = authDebouncer.debounce(
  'logout',
  async (fn: () => Promise<any>) => fn(),
  { delay: 500, leading: true }
);

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authDebouncer.clear();
  });
}