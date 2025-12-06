// ===== TIPOS COMPARTILHADOS DO SISTEMA DE ASSINATURA =====

export interface SubscriptionStatus {
  subscribed: boolean;
  status: 'active' | 'inactive' | 'canceled' | 'expired' | 'trial';
  plan_name: string;
  plan_price: number;
  expires_at: string | null;
  checked_at: string;
}

export interface StripeSubscriptionData {
  subscription_id: string;
  price_id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export interface DatabaseSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string;
  plan_name: string;
  plan_price: number;
  current_period_start: string | null;
  current_period_end: string | null;
  expires_at: string | null;
  cancel_at_period_end: boolean;
  sync_status: string;
  last_webhook_event: string | null;
  webhook_event_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CacheResult {
  is_active: boolean;
  status: string;
  plan_name: string;
  plan_price: number;
  expires_at: string | null;
  needs_refresh: boolean;
}
