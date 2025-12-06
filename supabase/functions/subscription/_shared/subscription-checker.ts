// ===== SUBSCRIPTION CHECKER - FONTE ÚNICA DE VERDADE =====

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { SubscriptionStatus, CacheResult, DatabaseSubscription } from "./types.ts";

export class SubscriptionChecker {
  private stripe: Stripe;

  constructor(
    private supabase: SupabaseClient,
    stripeKey: string
  ) {
    this.stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  }

  /**
   * Verifica assinatura usando estratégia em camadas:
   * 1. Cache (5 min TTL)
   * 2. Database
   * 3. Stripe (fallback)
   */
  async check(userId: string): Promise<SubscriptionStatus> {
    console.log('[SUBSCRIPTION-CHECKER] Checking subscription for user:', userId);

    // 1. Check cache first
    const cached = await this.checkCache(userId);
    if (cached && !cached.needs_refresh) {
      console.log('[SUBSCRIPTION-CHECKER] Returning cached result');
      return this.formatResult(cached);
    }

    // 2. Check database
    const dbSub = await this.checkDatabase(userId);
    if (dbSub && dbSub.status === 'active' && !this.isExpired(dbSub)) {
      console.log('[SUBSCRIPTION-CHECKER] Found active subscription in database');
      return this.formatResult(dbSub);
    }

    // 3. Check Stripe as fallback
    console.log('[SUBSCRIPTION-CHECKER] Checking Stripe');
    const stripeSub = await this.checkStripe(userId);

    // 4. Sync to database if found in Stripe
    if (stripeSub && stripeSub.status === 'active') {
      await this.syncToDatabase(userId, stripeSub);
    }

    return stripeSub
      ? this.formatResult(stripeSub)
      : this.formatInactive();
  }

  /**
   * Verifica cache usando RPC function
   */
  private async checkCache(userId: string): Promise<CacheResult | null> {
    try {
      const { data, error } = await this.supabase.rpc('check_subscription_cache', {
        p_user_id: userId,
        p_ttl_minutes: 5
      }).single();

      if (error) {
        console.warn('[SUBSCRIPTION-CHECKER] Cache check failed:', error);
        return null;
      }

      return data as CacheResult;
    } catch (error) {
      console.error('[SUBSCRIPTION-CHECKER] Cache error:', error);
      return null;
    }
  }

  /**
   * Busca assinatura no banco de dados
   */
  private async checkDatabase(userId: string): Promise<DatabaseSubscription | null> {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.warn('[SUBSCRIPTION-CHECKER] Database check failed:', error);
        return null;
      }

      return data as DatabaseSubscription | null;
    } catch (error) {
      console.error('[SUBSCRIPTION-CHECKER] Database error:', error);
      return null;
    }
  }

  /**
   * Verifica assinatura no Stripe
   */
  private async checkStripe(userId: string): Promise<any | null> {
    try {
      // Get user email from profiles
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!profile?.email) {
        console.warn('[SUBSCRIPTION-CHECKER] No email found for user');
        return null;
      }

      // Find Stripe customer
      const customers = await this.stripe.customers.list({
        email: profile.email,
        limit: 1
      });

      if (customers.data.length === 0) {
        console.log('[SUBSCRIPTION-CHECKER] No Stripe customer found');
        return null;
      }

      const customerId = customers.data[0].id;

      // Get active subscriptions
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length === 0) {
        console.log('[SUBSCRIPTION-CHECKER] No active subscription in Stripe');
        return null;
      }

      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0].price.id;

      // Map plan details
      const planDetails = this.mapPlanDetails(priceId);

      return {
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: 'active',
        plan_name: planDetails.name,
        plan_price: planDetails.price,
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        current_period_end: subscription.current_period_end
      };
    } catch (error) {
      console.error('[SUBSCRIPTION-CHECKER] Stripe check error:', error);
      return null;
    }
  }

  /**
   * Sincroniza dados do Stripe para o banco
   */
  private async syncToDatabase(userId: string, stripeData: any): Promise<void> {
    try {
      console.log('[SUBSCRIPTION-CHECKER] Syncing to database');

      await this.supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: stripeData.stripe_subscription_id,
        stripe_price_id: stripeData.stripe_price_id,
        status: 'active',
        plan_name: stripeData.plan_name,
        plan_price: stripeData.plan_price,
        expires_at: stripeData.expires_at,
        current_period_end: stripeData.expires_at,
        sync_status: 'checker',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('[SUBSCRIPTION-CHECKER] Sync error:', error);
      // Don't throw - sync is best-effort
    }
  }

  /**
   * Mapeia price_id para detalhes do plano
   */
  private mapPlanDetails(priceId: string): { name: string; price: number } {
    const trialPriceId = Deno.env.get("STRIPE_PRICE_ID_TRIAL");
    const monthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
    const annualPriceId = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");

    if (priceId === trialPriceId) {
      return { name: "Trial", price: 1.00 };
    } else if (priceId === monthlyPriceId) {
      return { name: "Mensal", price: 9.90 };
    } else if (priceId === annualPriceId) {
      return { name: "Anual", price: 99.90 };
    }

    return { name: "Desconhecido", price: 0 };
  }

  /**
   * Verifica se assinatura expirou
   */
  private isExpired(subscription: any): boolean {
    if (!subscription.expires_at) return false;
    return new Date(subscription.expires_at) < new Date();
  }

  /**
   * Formata resultado para formato padrão
   */
  private formatResult(data: any): SubscriptionStatus {
    return {
      subscribed: data.is_active ?? (data.status === 'active'),
      status: data.status || 'inactive',
      plan_name: data.plan_name || 'Desconhecido',
      plan_price: data.plan_price || 0,
      expires_at: data.expires_at || null,
      checked_at: new Date().toISOString()
    };
  }

  /**
   * Retorna resultado para assinatura inativa
   */
  private formatInactive(): SubscriptionStatus {
    return {
      subscribed: false,
      status: 'inactive',
      plan_name: 'Nenhum',
      plan_price: 0,
      expires_at: null,
      checked_at: new Date().toISOString()
    };
  }
}
