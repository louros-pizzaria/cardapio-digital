// ===== CACHE MANAGER INTELIGENTE COM TTL DINÂMICO =====

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  enableCompression: boolean;
  enableMetrics: boolean;
}

class IntelligentCacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private accessOrder: string[] = [];
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressionSaved: 0
  };

  private config: CacheConfig = {
    maxSize: 200,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    enableCompression: true,
    enableMetrics: true
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Auto cleanup every 30 seconds
    setInterval(() => this.cleanup(), 30000);
  }

  // ===== CORE CACHE OPERATIONS =====
  set<T>(
    key: string, 
    data: T, 
    ttl?: number, 
    priority: CacheItem<T>['priority'] = 'normal'
  ): void {
    const finalTTL = ttl || this.getTTLByPriority(priority);
    
    const item: CacheItem<T> = {
      data: this.config.enableCompression ? this.compress(data) : data,
      timestamp: Date.now(),
      ttl: finalTTL,
      hits: 0,
      priority
    };

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, item);
    this.updateAccessOrder(key);
    
    console.log(`🗄️ Cached: ${key} (TTL: ${finalTTL}ms, Priority: ${priority})`);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.config.enableMetrics && this.metrics.misses++;
      return null;
    }

    // Check TTL with dynamic adjustment
    const age = Date.now() - item.timestamp;
    const adjustedTTL = this.getAdjustedTTL(item);

    if (age > adjustedTTL) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.config.enableMetrics && this.metrics.misses++;
      return null;
    }

    // Update metrics and access
    item.hits++;
    this.updateAccessOrder(key);
    this.config.enableMetrics && this.metrics.hits++;

    const data = this.config.enableCompression ? this.decompress(item.data) : item.data;
    
    console.log(`⚡ Cache HIT: ${key} (hits: ${item.hits})`);
    return data;
  }

  // ===== ADVANCED CACHE STRATEGIES =====
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl?: number
  ): T {
    const generateKey = keyGenerator || ((...args) => JSON.stringify(args));

    return ((...args: Parameters<T>) => {
      const key = `memoized:${fn.name}:${generateKey(...args)}`;
      
      let result = this.get<ReturnType<T>>(key);
      if (result === null) {
        result = fn(...args);
        this.set(key, result, ttl, 'normal');
      }
      
      return result;
    }) as T;
  }

  async memoizeAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl?: number
  ): Promise<T> {
    const generateKey = keyGenerator || ((...args) => JSON.stringify(args));

    return (async (...args: Parameters<T>) => {
      const key = `async-memoized:${fn.name}:${generateKey(...args)}`;
      
      let result = this.get<Awaited<ReturnType<T>>>(key);
      if (result === null) {
        result = await fn(...args);
        this.set(key, result, ttl, 'normal');
      }
      
      return result;
    }) as T;
  }

  // ===== BATCH OPERATIONS =====
  setMany<T>(items: Array<{ key: string; data: T; ttl?: number; priority?: CacheItem<T>['priority'] }>): void {
    items.forEach(({ key, data, ttl, priority }) => {
      this.set(key, data, ttl, priority);
    });
  }

  getMany<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.get<T>(key)
    }));
  }

  // ===== SMART INVALIDATION =====
  invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    console.log(`🧹 Invalidated ${invalidated} keys matching pattern: ${pattern}`);
    return invalidated;
  }

  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (tags.some(tag => key.includes(tag))) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    console.log(`🧹 Invalidated ${invalidated} keys with tags: ${tags.join(', ')}`);
    return invalidated;
  }

  // ===== CACHE WARMING =====
  warm<T>(
    entries: Array<{ key: string; loader: () => Promise<T>; priority?: CacheItem<T>['priority'] }>
  ): Promise<void[]> {
    console.log(`🔥 Warming cache with ${entries.length} entries`);
    
    return Promise.all(
      entries.map(async ({ key, loader, priority = 'normal' }) => {
        try {
          const data = await loader();
          this.set(key, data, undefined, priority);
        } catch (error) {
          console.warn(`Failed to warm cache for key: ${key}`, error);
        }
      })
    );
  }

  // ===== UTILITY METHODS =====
  private getTTLByPriority(priority: CacheItem<any>['priority']): number {
    const multipliers = {
      low: 0.5,
      normal: 1,
      high: 2,
      critical: 5
    };
    
    return this.config.defaultTTL * multipliers[priority];
  }

  private getAdjustedTTL(item: CacheItem<any>): number {
    // Extend TTL for frequently accessed items
    const hitBonus = Math.min(item.hits * 0.1, 2); // Max 2x extension
    return item.ttl * (1 + hitBonus);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // Find least recently used with lowest priority
    const lruKey = this.accessOrder.find(key => {
      const item = this.cache.get(key);
      return item?.priority !== 'critical';
    }) || this.accessOrder[0];

    this.cache.delete(lruKey);
    this.removeFromAccessOrder(lruKey);
    this.config.enableMetrics && this.metrics.evictions++;
    
    console.log(`🗑️ Evicted LRU: ${lruKey}`);
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private compress<T>(data: T): T {
    // Simple compression simulation - in production, use actual compression
    if (typeof data === 'string' && data.length > 1000) {
      this.config.enableMetrics && (this.metrics.compressionSaved += data.length * 0.3);
    }
    return data;
  }

  private decompress<T>(data: T): T {
    // Decompression would happen here
    return data;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      const age = now - item.timestamp;
      const adjustedTTL = this.getAdjustedTTL(item);

      if (age > adjustedTTL) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleaned++;
      }
    }

    // Automatic memory pressure relief
    if (this.cache.size > this.config.maxSize * 0.8) {
      this.evictLRU();
    }

    if (cleaned > 0) {
      console.log(`🧽 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Automatic timeout cleanup for orders
  cleanupOrderCache(): void {
    const cleaned = this.invalidateByPattern(/^(order|cart|checkout)/);
    console.log(`🛒 Cleaned ${cleaned} order-related cache entries`);
  }

  // ===== PUBLIC API =====
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    console.log('🗑️ Cache cleared');
  }

  size(): number {
    return this.cache.size;
  }

  getMetrics() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100;
    
    return {
      ...this.metrics,
      hitRate: isNaN(hitRate) ? 0 : hitRate,
      size: this.cache.size,
      memoryUsage: this.accessOrder.length
    };
  }

  debug(): void {
    console.group('🔍 Cache Debug Info');
    console.log('Size:', this.cache.size);
    console.log('Metrics:', this.getMetrics());
    console.log('Access Order:', this.accessOrder.slice(-10)); // Last 10
    console.groupEnd();
  }
}

// ===== EXPORTS =====
export const cacheManager = new IntelligentCacheManager({
  maxSize: 150,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  enableCompression: true,
  enableMetrics: true
});

// Specific cache instances for different use cases
export const queryCache = new IntelligentCacheManager({
  maxSize: 100,
  defaultTTL: 30 * 1000, // 30 seconds for queries
  enableCompression: false,
  enableMetrics: true
});

export const imageCache = new IntelligentCacheManager({
  maxSize: 50,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for images
  enableCompression: false,
  enableMetrics: false
});

// Export the class for custom instances
export { IntelligentCacheManager };