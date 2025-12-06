// ===== CONFIGURAÇÃO UNIFICADA DO REACT QUERY =====
// Consolidação de query.ts + queryClient.ts

import { QueryClient } from '@tanstack/react-query';

// ===== CACHE STRATEGIES BY DOMAIN =====
export const CACHE_STRATEGIES = {
  // Static data: categories, product templates (24h cache)
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },
  
  // Semi-static data: user profiles, settings (1h cache)
  SEMI_STATIC: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 6 * 60 * 60 * 1000, // 6 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Dynamic data: products, menu items (5min cache) 
  DYNAMIC: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Critical data: stock, prices (30s cache)
  CRITICAL: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Real-time data: orders, payments, admin stats (30s cache)
  REALTIME: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
} as const;

// ===== STANDARDIZED QUERY KEYS =====
export const QUERY_KEYS = {
  // Menu system
  CATEGORIES: ['menu', 'categories'] as const,
  PRODUCTS: (subcategoryId?: string) => ['menu', 'products', subcategoryId] as const,
  PRODUCT_DETAIL: (productId: string) => ['menu', 'product', productId] as const,
  
  // Orders system  
  ORDERS: ['orders'] as const,
  ORDER_DETAIL: (orderId: string) => ['orders', orderId] as const,
  RECENT_ORDERS: ['orders', 'recent'] as const,
  
  // Admin system
  ADMIN_STATS: ['admin', 'stats'] as const,
  ADMIN_ORDERS: ['admin', 'orders'] as const,
  ADMIN_CUSTOMERS: ['admin', 'customers'] as const,
  ADMIN_PRODUCTS: ['admin', 'products'] as const,
  
  // User system
  USER_PROFILE: ['user', 'profile'] as const,
  USER_ADDRESSES: ['user', 'addresses'] as const,
  USER_SUBSCRIPTION: ['user', 'subscription'] as const,
} as const;

// ===== QUERY CLIENT INSTANCE =====
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
      networkMode: 'offlineFirst',
      refetchOnMount: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});

// ===== TARGETED INVALIDATION FUNCTIONS =====
export const invalidateQueries = {
  // Specific invalidation by domain
  menu: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
    queryClient.removeQueries({ queryKey: ['menu', 'products'], exact: false });
  },
  
  orders: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_STATS });
  },
  
  adminStats: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_STATS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ORDERS });
  },
  
  user: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ADDRESSES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_SUBSCRIPTION });
  },
  
  // Pré-loading estratégico
  preloadMenu: async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.CATEGORIES,
      staleTime: CACHE_STRATEGIES.STATIC.staleTime,
    });
  },
  
  // Background refresh
  backgroundRefresh: () => {
    queryClient.refetchQueries({ 
      queryKey: QUERY_KEYS.ORDERS,
      type: 'active',
    });
  },
  
  // Emergency invalidation
  all: () => {
    queryClient.invalidateQueries();
  },
} as const;

// ===== PERFORMANCE MONITORING =====
export const performanceMonitor = {
  startTime: Date.now(),
  
  logQueryPerformance: (queryKey: any[], duration: number) => {
    if (duration > 1000) {
      console.warn(`🐌 Slow query detected: ${JSON.stringify(queryKey)} took ${duration}ms`);
    }
  },
  
  trackCacheHit: (queryKey: any[], fromCache: boolean) => {
    const prefix = fromCache ? '⚡ Cache HIT' : '🌐 Network fetch';
    console.log(`${prefix}: ${JSON.stringify(queryKey)}`);
  },
};
