import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, ReactNode } from 'react';

// ===== COMPONENTE DE VIRTUALIZAÇÃO PARA LISTAS GRANDES =====

interface VirtualizedListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => ReactNode;
  containerClassName?: string;
  itemClassName?: string;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  estimateSize,
  renderItem,
  containerClassName = '',
  itemClassName = '',
  overscan = 5
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan
  });

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height: '100%', width: '100%' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            className={itemClassName}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
