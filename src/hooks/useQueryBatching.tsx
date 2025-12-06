// ===== HOOK PARA QUERY BATCHING E CONSOLIDAÇÃO =====

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheManager } from '@/utils/cacheManager';

interface BatchedQuery {
  table: string;
  select: string;
  filters: Record<string, any>;
  callback: (data: any) => void;
  errorCallback?: (error: Error) => void;
}

class QueryBatcher {
  private batches: Map<string, BatchedQuery[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchDelay = 50; // 50ms batch window

  addToBatch(query: BatchedQuery): void {
    const batchKey = `${query.table}-${query.select}`;
    
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, []);
    }
    
    this.batches.get(batchKey)!.push(query);
    
    // Clear existing timer and set new one
    const existingTimer = this.timers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const timer = setTimeout(() => {
      this.executeBatch(batchKey);
    }, this.batchDelay);
    
    this.timers.set(batchKey, timer);
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const queries = this.batches.get(batchKey);
    if (!queries || queries.length === 0) return;

    const [table, select] = batchKey.split('-', 2);
    
    console.log(`🚀 Executing batched query for ${table} with ${queries.length} requests`);

    try {
      // Consolidate filters
      const allIds = new Set<string>();
      const filtersByType = new Map<string, Set<any>>();

      queries.forEach(query => {
        Object.entries(query.filters).forEach(([key, value]) => {
          if (key === 'id' || key.endsWith('_id')) {
            allIds.add(value);
          } else {
            if (!filtersByType.has(key)) {
              filtersByType.set(key, new Set());
            }
            filtersByType.get(key)!.add(value);
          }
        });
      });

      // Build consolidated query - simplified with any type
      let query = supabase.from(table as any).select(select);

      const { data, error } = await query;

      if (error) throw error;

      // Distribute results to callbacks
      queries.forEach(originalQuery => {
        try {
          const filteredData = this.filterDataForQuery(data, originalQuery.filters);
          originalQuery.callback(filteredData);
        } catch (err) {
          originalQuery.errorCallback?.(err as Error);
        }
      });

      // Cache the consolidated result
      const cacheKey = `batch-${batchKey}-${JSON.stringify(Array.from(allIds).sort())}`;
      cacheManager.set(cacheKey, data, 30000, 'high'); // 30 second cache

    } catch (error) {
      console.error(`❌ Batched query failed for ${batchKey}:`, error);
      
      // Execute individual queries as fallback
      queries.forEach(async (query) => {
        try {
          const { data, error } = await supabase
            .from(query.table as any)
            .select(query.select);
            
          if (error) throw error;
          query.callback(data);
        } catch (err) {
          query.errorCallback?.(err as Error);
        }
      });
    } finally {
      // Clean up
      this.batches.delete(batchKey);
      this.timers.delete(batchKey);
    }
  }

  private filterDataForQuery(data: any[], filters: Record<string, any>): any[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }
}

const globalQueryBatcher = new QueryBatcher();

// ===== HOOK PARA BATCHING AUTOMÁTICO =====
export const useBatchedQuery = <T = any>(
  queryKey: string[],
  table: string,
  select: string,
  filters: Record<string, any>,
  options: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  } = {}
) => {
  const queryClient = useQueryClient();
  const callbackRef = useRef<((data: T[]) => void) | null>(null);
  const errorCallbackRef = useRef<((error: Error) => void) | null>(null);

  // Check cache first
  const cacheKey = `query-${table}-${JSON.stringify(filters)}`;
  const cachedData = cacheManager.get<T[]>(cacheKey);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => {
      return new Promise<T[]>((resolve, reject) => {
        callbackRef.current = resolve;
        errorCallbackRef.current = reject;

        // Add to batch
        globalQueryBatcher.addToBatch({
          table,
          select,
          filters,
          callback: (data: T[]) => {
            // Cache individual result
            cacheManager.set(cacheKey, data, 30000, 'normal');
            resolve(data);
          },
          errorCallback: reject
        });
      });
    },
    enabled: options.enabled !== false && !cachedData,
    staleTime: options.staleTime || 30000,
    gcTime: options.cacheTime || 300000,
    initialData: cachedData || undefined
  });

  return {
    data: data || cachedData || [],
    isLoading: isLoading && !cachedData,
    error,
    refetch
  };
};

// ===== HOOK PARA QUERIES CONSOLIDADAS DO ADMIN =====
export const useConsolidatedAdminQueries = () => {
  const queryClient = useQueryClient();

  // Single consolidated query for admin overview
  const { data: adminData, isLoading, refetch } = useQuery({
    queryKey: ['admin-consolidated'],
    queryFn: async () => {
      console.log('🔄 Executing consolidated admin query');
      
      // Check cache first
      const cacheKey = 'admin-consolidated-data';
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        console.log('⚡ Admin data cache HIT');
        return cached;
      }

      // Execute all admin queries in parallel
      const [ordersRes, usersRes, productsRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id,
            status,
            total_amount,
            created_at,
            payment_status
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        
        supabase
          .from('profiles')
          .select('id, full_name, email, created_at, role')
          .limit(50),
        
        supabase
          .from('products')
          .select('id, name, price, is_available, category_id')
          .limit(100)
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (usersRes.error) throw usersRes.error;
      if (productsRes.error) throw productsRes.error;

      const consolidatedData = {
        orders: ordersRes.data || [],
        users: usersRes.data || [],
        products: productsRes.data || [],
        fetchedAt: new Date().toISOString()
      };

      // Cache for 2 minutes
      cacheManager.set(cacheKey, consolidatedData, 120000, 'critical');
      
      console.log('✅ Consolidated admin data fetched and cached');
      return consolidatedData;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000,   // 5 minutes
  });

  // Derived data with memoization
  const stats = cacheManager.memoize(
    (data: any) => {
      if (!data || !data.orders) return null;

      const today = new Date().toDateString();
      const todayOrders = data.orders.filter(
        (order: any) => new Date(order.created_at).toDateString() === today
      );

      return {
        totalOrders: data.orders.length,
        todayOrders: todayOrders.length,
        pendingOrders: data.orders.filter((o: any) => o.status === 'pending').length,
        totalRevenue: data.orders
          .filter((o: any) => o.status === 'delivered')
          .reduce((sum: number, o: any) => sum + o.total_amount, 0),
        todayRevenue: todayOrders
          .filter((o: any) => o.status === 'delivered')
          .reduce((sum: number, o: any) => sum + o.total_amount, 0),
        totalUsers: data.users?.length || 0,
        totalProducts: data.products?.length || 0,
        availableProducts: data.products?.filter((p: any) => p.is_available).length || 0
      };
    },
    (data: any) => `stats-${data?.fetchedAt}`,
    60000 // 1 minute cache
  );

  const invalidateAdminData = useCallback(() => {
    cacheManager.invalidateByPattern(/^admin-/);
    queryClient.invalidateQueries({ queryKey: ['admin-consolidated'] });
  }, [queryClient]);

  return {
    data: adminData,
    stats: adminData ? stats(adminData) : null,
    isLoading,
    refetch,
    invalidateAdminData
  };
};