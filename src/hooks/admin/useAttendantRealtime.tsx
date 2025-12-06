import { useQueryClient } from '@tanstack/react-query';
import { useBaseRealtime } from '@/hooks/realtime/useBaseRealtime';
import { debouncedInvalidate } from '@/utils/debounceInvalidation';
import { useSound } from '@/hooks/useSound';
import { useAutoPrint } from '@/hooks/useAutoPrint';

export const useAttendantRealtime = () => {
  const queryClient = useQueryClient();
  const { playNewOrderSound } = useSound();
  const { tryAutoPrint } = useAutoPrint();

  const { isConnected, metrics } = useBaseRealtime({
    channelName: 'attendant-unified',
    tables: ['orders', 'order_items'],
    debounceMs: 100, // Reduced from 300ms for faster updates
    onEvent: (payload) => {
      console.log('[ATTENDANT REALTIME] 📡 Event:', payload.eventType, payload.table);
      console.log('[ATTENDANT REALTIME] 🔔 Event processed:', {
        table: payload.table,
        eventType: payload.eventType,
        timestamp: new Date().toISOString(),
        triggeredRefetch: true
      });

      // Debounced invalidation (no refetch)
      debouncedInvalidate(queryClient, ['attendant-data'], 300);

      // Handle new orders
      if (payload.eventType === 'INSERT' && payload.table === 'orders') {
        console.log('[ATTENDANT REALTIME] 🆕 New order received');
        
        // Play sound
        playNewOrderSound();
        
        // Try auto-print
        tryAutoPrint(payload.new);
      }

      // Handle order updates
      if (payload.eventType === 'UPDATE' && payload.table === 'orders') {
        const oldStatus = payload.old?.status;
        const newStatus = payload.new?.status;
        
        if (oldStatus !== newStatus) {
          console.log('[ATTENDANT REALTIME] 🔄 Order status changed:', oldStatus, '→', newStatus);
        }
      }
    }
  });

  return {
    isConnected,
    metrics
  };
};
