// ===== UNIFIED REALTIME SERVICE =====
// Consolidated from realtime.ts + realtimeManager.ts (Phase 2.2)

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventCallback = (payload: any) => void;
type EventType = 'orders' | 'order_items' | 'products' | 'profiles' | 'subscriptions' | 'payments' | 'connection';

/**
 * Unified Realtime Service - Single WebSocket Connection
 * 
 * Features:
 * - Auto-connect/disconnect based on subscribers
 * - Event debouncing (300ms) to prevent floods
 * - Automatic reconnect with exponential backoff
 * - Strong event typing
 * - React hooks ready to use
 * - Subscriber statistics and monitoring
 * 
 * Usage:
 * ```typescript
 * // Functional API
 * import { subscribeToOrders } from '@/services/realtime';
 * const unsubscribe = subscribeToOrders((payload) => {
 *   console.log('Order event:', payload);
 * });
 * 
 * // React Hook API
 * import { useOrdersRealtime } from '@/services/realtime';
 * useOrdersRealtime((payload) => {
 *   console.log('Order event:', payload);
 * });
 * ```
 */
class UnifiedRealtimeService {
  private static instance: UnifiedRealtimeService;
  private channel: RealtimeChannel | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private baseReconnectDelay: number = 1000; // 1 second
  private subscribers: Map<EventType, EventCallback[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private autoDisconnectTimer: NodeJS.Timeout | null = null;

  static getInstance(): UnifiedRealtimeService {
    if (!UnifiedRealtimeService.instance) {
      UnifiedRealtimeService.instance = new UnifiedRealtimeService();
    }
    return UnifiedRealtimeService.instance;
  }

  // ===== CONNECTION MANAGEMENT =====
  connect() {
    if (this.isConnected) {
      console.debug('[Realtime] Already connected, skipping');
      return;
    }

    console.log('🔗 Connecting to Realtime (unified service)...');

    this.channel = supabase
      .channel('unified-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => this.handleEvent('orders', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload) => this.handleEvent('order_items', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => this.handleEvent('products', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => this.handleEvent('profiles', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        (payload) => this.handleEvent('subscriptions', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.reconnectAttempts = 0; // Reset on successful connection
          console.log('✅ Realtime connected successfully');
          this.dispatch('connection', { status: 'connected' });
        } else if (status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          console.error('❌ Realtime connection error');
          this.dispatch('connection', { status: 'error' });
          this.handleConnectionError();
        } else if (status === 'CLOSED') {
          this.isConnected = false;
          console.warn('⚠️ Realtime connection closed');
          this.dispatch('connection', { status: 'disconnected' });
          this.handleConnectionError();
        }
      });

    this.cancelAutoDisconnect();
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.dispatch('connection', { status: 'disconnected' });
      console.log('🔌 Realtime disconnected');
    }

    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  // ===== RECONNECT LOGIC WITH EXPONENTIAL BACKOFF =====
  private handleConnectionError() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.dispatch('connection', { status: 'failed', attempts: this.reconnectAttempts });
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      if (!this.isConnected && this.getTotalSubscribers() > 0) {
        this.connect();
      }
    }, delay);
  }

  // ===== EVENT HANDLING WITH DEBOUNCE =====
  private handleEvent(eventType: EventType, payload: any) {
    const debounceKey = `${eventType}-${payload.eventType || 'update'}`;

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced dispatch
    const timer = setTimeout(() => {
      this.dispatch(eventType, payload);
      this.debounceTimers.delete(debounceKey);
    }, 300); // 300ms debounce

    this.debounceTimers.set(debounceKey, timer);
  }

  private dispatch(eventType: EventType, payload: any) {
    const callbacks = this.subscribers.get(eventType) || [];
    
    if (callbacks.length === 0 && eventType !== 'connection') {
      console.debug(`[Realtime] No subscribers for event: ${eventType}`);
      return;
    }

    console.debug(`[Realtime] Dispatching ${eventType} to ${callbacks.length} subscriber(s)`);

    callbacks.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[Realtime] Error in ${eventType} callback:`, error);
      }
    });
  }

  // ===== SUBSCRIPTION MANAGEMENT =====
  subscribe(eventType: EventType, callback: EventCallback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(callback);

    console.debug(`[Realtime] New subscriber for ${eventType} (total: ${this.getTotalSubscribers()})`);

    // Auto-connect if not connected
    if (!this.isConnected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }

        console.debug(
          `[Realtime] Unsubscribed from ${eventType} (remaining: ${this.getTotalSubscribers()})`
        );

        // Schedule auto-disconnect if no more subscribers
        if (this.getTotalSubscribers() === 0) {
          this.scheduleAutoDisconnect();
        }
      }
    };
  }

  // ===== AUTO-DISCONNECT WHEN NO SUBSCRIBERS =====
  private scheduleAutoDisconnect() {
    this.cancelAutoDisconnect();

    this.autoDisconnectTimer = setTimeout(() => {
      if (this.getTotalSubscribers() === 0 && this.isConnected) {
        console.log('🔌 Auto-disconnecting Realtime (no subscribers for 30s)');
        this.disconnect();
      }
    }, 30000); // 30 seconds
  }

  private cancelAutoDisconnect() {
    if (this.autoDisconnectTimer) {
      clearTimeout(this.autoDisconnectTimer);
      this.autoDisconnectTimer = null;
    }
  }

  // ===== UTILITY METHODS =====
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getTotalSubscribers(): number {
    let total = 0;
    this.subscribers.forEach((callbacks) => {
      total += callbacks.length;
    });
    return total;
  }

  getSubscribersByType(): Record<EventType, number> {
    const stats: any = {};
    this.subscribers.forEach((callbacks, eventType) => {
      stats[eventType] = callbacks.length;
    });
    return stats;
  }

  getStats() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      totalSubscribers: this.getTotalSubscribers(),
      subscribersByType: this.getSubscribersByType(),
      channelName: this.channel?.topic || null,
    };
  }

  // Force reconnect (useful for debugging)
  forceReconnect() {
    console.log('🔄 Force reconnecting...');
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// ===== SINGLETON INSTANCE =====
export const realtimeService = UnifiedRealtimeService.getInstance();

// ===== FUNCTIONAL API - SPECIFIC SUBSCRIPTION FUNCTIONS =====
export const subscribeToOrders = (callback: EventCallback) =>
  realtimeService.subscribe('orders', callback);

export const subscribeToOrderItems = (callback: EventCallback) =>
  realtimeService.subscribe('order_items', callback);

export const subscribeToProducts = (callback: EventCallback) =>
  realtimeService.subscribe('products', callback);

export const subscribeToProfiles = (callback: EventCallback) =>
  realtimeService.subscribe('profiles', callback);

export const subscribeToSubscriptions = (callback: EventCallback) =>
  realtimeService.subscribe('subscriptions', callback);

export const subscribeToPayments = (callback: EventCallback) =>
  realtimeService.subscribe('payments', callback);

export const subscribeToConnection = (callback: EventCallback) =>
  realtimeService.subscribe('connection', callback);

// ===== REACT HOOKS API =====
export const useRealtimeManager = () => {
  return {
    connect: () => realtimeService.connect(),
    disconnect: () => realtimeService.disconnect(),
    isConnected: () => realtimeService.getConnectionStatus(),
    subscribe: (eventType: EventType, callback: EventCallback) =>
      realtimeService.subscribe(eventType, callback),
    getStats: () => realtimeService.getStats(),
    forceReconnect: () => realtimeService.forceReconnect(),
  };
};

export const useOrdersRealtime = (callback: EventCallback) => {
  return realtimeService.subscribe('orders', callback);
};

export const useProductsRealtime = (callback: EventCallback) => {
  return realtimeService.subscribe('products', callback);
};

export const useProfilesRealtime = (callback: EventCallback) => {
  return realtimeService.subscribe('profiles', callback);
};

export const useSubscriptionsRealtime = (callback: EventCallback) => {
  return realtimeService.subscribe('subscriptions', callback);
};
