// ===== HOOK DE DEBOUNCE PARA OTIMIZAÇÃO DE BUSCAS =====

import { useState, useEffect } from 'react';

export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Specific hook for search with 300ms debounce
export const useSearchDebounce = (searchTerm: string) => {
  return useDebounce(searchTerm, 300);
};