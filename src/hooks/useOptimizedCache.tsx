// ===== HOOK PARA CACHE OTIMIZADO E QUERY DEDUPLICATION =====

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { memoryCache } from '@/utils/performance';

interface CacheOptions {
  ttl?: number; // Time to live em milliseconds
  background?: boolean; // Se deve fazer refresh em background
  dedupe?: boolean; // Se deve fazer deduplication
}

// Map para tracking de queries ativas (deduplication)
const activeQueries = new Map<string, Promise<any>>();

// Map para tracking de cache invalidation
const invalidationQueue = new Set<string>();

export const useOptimizedCache = () => {
  const queryClient = useQueryClient();
  const backgroundRefreshRef = useRef<NodeJS.Timeout>();

  // FUNÇÃO 1: Cache inteligente com TTL dinâmico
  const cacheData = useCallback((key: string, data: any, options: CacheOptions = {}) => {
    const { ttl = 5 * 60 * 1000 } = options; // Default 5 minutos
    
    memoryCache.set(key, data, ttl);
    console.log(`💾 Cached data for key: ${key} (TTL: ${ttl}ms)`);
  }, []);

  // FUNÇÃO 2: Buscar do cache com fallback
  const getCachedData = useCallback((key: string) => {
    const cached = memoryCache.get(key);
    if (cached) {
      console.log(`⚡ Cache HIT: ${key}`);
      return cached;
    }
    console.log(`💨 Cache MISS: ${key}`);
    return null;
  }, []);

  // FUNÇÃO 3: Query deduplication
  const deduplicateQuery = useCallback(async (
    queryId: string,
    queryFn: () => Promise<any>
  ): Promise<any> => {
    // Se já existe uma query ativa com o mesmo ID, aguardar ela
    if (activeQueries.has(queryId)) {
      console.log(`🔄 Deduplicating query: ${queryId}`);
      return activeQueries.get(queryId)!;
    }

    // Registrar a nova query
    const queryPromise = queryFn();
    activeQueries.set(queryId, queryPromise);

    try {
      const result = await queryPromise;
      return result;
    } finally {
      // Remover da lista de queries ativas
      activeQueries.delete(queryId);
    }
  }, []);

  // FUNÇÃO 4: Invalidação granular e inteligente
  const invalidateByPattern = useCallback((pattern: string | RegExp) => {
    console.log(`🗑️ Invalidating queries matching: ${pattern}`);
    
    if (typeof pattern === 'string') {
      // Invalidar queries que contenham o padrão
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey.some(key => 
            typeof key === 'string' && key.includes(pattern)
          )
      });
      
      // Limpar cache em memória também
      memoryCache.clear();
    } else {
      // Invalidar usando regex
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey.some(key => 
            typeof key === 'string' && pattern.test(key)
          )
      });
    }
  }, [queryClient]);

  // FUNÇÃO 5: Background refresh inteligente
  const scheduleBackgroundRefresh = useCallback((
    queryKeys: string[][],
    interval: number = 5 * 60 * 1000 // 5 minutos default
  ) => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
    }

    backgroundRefreshRef.current = setInterval(() => {
      console.log('🔄 Background refresh triggered');
      
      queryKeys.forEach(queryKey => {
        queryClient.refetchQueries({
          queryKey,
          type: 'active', // Apenas queries ativas
        });
      });
    }, interval);

    // Cleanup function
    return () => {
      if (backgroundRefreshRef.current) {
        clearInterval(backgroundRefreshRef.current);
      }
    };
  }, [queryClient]);

  // FUNÇÃO 6: Prefetch estratégico
  const prefetchStrategic = useCallback(async (
    queryKey: any[],
    queryFn: () => Promise<any>,
    options: { priority?: 'high' | 'low'; cacheTime?: number } = {}
  ) => {
    const { priority = 'low', cacheTime = 10 * 60 * 1000 } = options;
    
    // Verificar se já está em cache
    const existing = queryClient.getQueryData(queryKey);
    if (existing) {
      console.log(`⚡ Prefetch skipped (already cached): ${JSON.stringify(queryKey)}`);
      return;
    }

    try {
      if (priority === 'high') {
        // Prefetch imediato
        await queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: cacheTime,
        });
      } else {
        // Prefetch com delay (low priority)
        setTimeout(() => {
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: cacheTime,
          });
        }, 100);
      }
      
      console.log(`🚀 Prefetched: ${JSON.stringify(queryKey)}`);
    } catch (error) {
      console.error('❌ Prefetch failed:', error);
    }
  }, [queryClient]);

  // FUNÇÃO 7: Otimistic updates seguros
  const optimisticUpdate = useCallback((
    queryKey: any[],
    updaterFn: (oldData: any) => any,
    onError?: () => void
  ) => {
    // Salvar estado anterior para rollback
    const previousData = queryClient.getQueryData(queryKey);
    
    // Aplicar update otimista
    queryClient.setQueryData(queryKey, updaterFn);
    
    console.log(`⚡ Optimistic update applied: ${JSON.stringify(queryKey)}`);
    
    // Retornar função de rollback
    return () => {
      console.log(`↩️ Rolling back optimistic update: ${JSON.stringify(queryKey)}`);
      queryClient.setQueryData(queryKey, previousData);
      onError?.();
    };
  }, [queryClient]);

  // FUNÇÃO 8: Cache statistics
  const getCacheStats = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const activeCount = queries.filter(q => q.observers.length > 0).length;
    const staleCount = queries.filter(q => q.isStale()).length;
    
    return {
      totalQueries: queries.length,
      activeQueries: activeCount,
      staleQueries: staleCount,
      memoryCache: {
        size: (memoryCache as any).cache?.size || 0,
      },
      activeNetworkQueries: activeQueries.size,
    };
  }, [queryClient]);

  return {
    cacheData,
    getCachedData,
    deduplicateQuery,
    invalidateByPattern,
    scheduleBackgroundRefresh,
    prefetchStrategic,
    optimisticUpdate,
    getCacheStats,
  };
};