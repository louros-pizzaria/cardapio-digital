import { QueryClient } from '@tanstack/react-query';

const invalidationTimers = new Map<string, NodeJS.Timeout>();

export const debouncedInvalidate = (
  queryClient: QueryClient,
  queryKey: any[],
  delayMs = 300
) => {
  const key = JSON.stringify(queryKey);
  
  // Clear previous timer
  if (invalidationTimers.has(key)) {
    clearTimeout(invalidationTimers.get(key)!);
  }
  
  // Create new timer
  const timer = setTimeout(() => {
    console.log('[DEBOUNCE] ⏱️ Invalidating query:', queryKey);
    queryClient.invalidateQueries({ 
      queryKey,
      refetchType: 'active' // Force refetch of active queries
    });
    invalidationTimers.delete(key);
  }, delayMs);
  
  invalidationTimers.set(key, timer);
};
