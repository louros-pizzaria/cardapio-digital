import { useState, useEffect, useCallback, useMemo } from 'react';

// ===== HOOK PARA VIRTUALIZAÇÃO DE LISTAS GRANDES =====

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualization = <T,>(
  items: T[],
  options: VirtualizationOptions
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  const startIndex = useMemo(() => {
    const index = Math.floor(scrollTop / itemHeight);
    return Math.max(0, index - overscan);
  }, [scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    const index = startIndex + visibleCount + overscan * 2;
    return Math.min(items.length - 1, index);
  }, [startIndex, visibleCount, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    totalHeight,
    visibleItems,
    handleScroll,
    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative' as const
      },
      onScroll: handleScroll
    },
    innerProps: {
      style: {
        height: totalHeight,
        position: 'relative' as const
      }
    }
  };
};