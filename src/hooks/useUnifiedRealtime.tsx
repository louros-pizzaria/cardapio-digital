import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventCallback = (payload: any) => void;
type EventType = 'orders' | 'order_items' | 'products' | 'profiles' | 'subscriptions';

interface UseUnifiedRealtimeOptions {
  events: EventType[];
  onEvent?: EventCallback;
}

/**
 * Hook unificado para gerenciar conexões Realtime do Supabase
 * Resolve o problema de múltiplos canais duplicados
 */
export const useUnifiedRealtime = ({ events, onEvent }: UseUnifiedRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef<Map<EventType, EventCallback[]>>(new Map());

  // Registrar callback
  const subscribe = useCallback((eventType: EventType, callback: EventCallback) => {
    const callbacks = callbacksRef.current.get(eventType) || [];
    callbacksRef.current.set(eventType, [...callbacks, callback]);

    return () => {
      const current = callbacksRef.current.get(eventType) || [];
      callbacksRef.current.set(
        eventType,
        current.filter((cb) => cb !== callback)
      );
    };
  }, []);

  useEffect(() => {
    if (!events.length) return;

    // Criar um único canal para todos os eventos
    const channelName = `unified-realtime-${events.join('-')}`;
    const channel = supabase.channel(channelName);

    // Registrar listeners para cada tipo de evento
    events.forEach((eventType) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: eventType,
        },
        (payload) => {
          // Chamar callback global se existir
          onEvent?.(payload);

          // Chamar callbacks específicos do tipo de evento
          const callbacks = callbacksRef.current.get(eventType) || [];
          callbacks.forEach((callback) => callback(payload));
        }
      );
    });

    // Subscrever ao canal
    channel.subscribe((status) => {
      console.log(`[Realtime] Canal ${channelName} status:`, status);
    });

    channelRef.current = channel;

    // Cleanup: remover canal ao desmontar
    return () => {
      console.log(`[Realtime] Removendo canal ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [events, onEvent]);

  return { subscribe };
};

/**
 * Hook específico para escutar mudanças em pedidos
 */
export const useOrdersRealtime = (callback: EventCallback) => {
  useUnifiedRealtime({
    events: ['orders', 'order_items'],
    onEvent: callback,
  });
};

/**
 * Hook específico para escutar mudanças em produtos
 */
export const useProductsRealtime = (callback: EventCallback) => {
  useUnifiedRealtime({
    events: ['products'],
    onEvent: callback,
  });
};

/**
 * Hook específico para escutar mudanças em assinaturas
 */
export const useSubscriptionsRealtime = (callback: EventCallback) => {
  useUnifiedRealtime({
    events: ['subscriptions'],
    onEvent: callback,
  });
};
