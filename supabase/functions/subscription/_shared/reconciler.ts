// ===== SUBSCRIPTION RECONCILER =====

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

interface ReconciliationResult {
  changes: number;
  subscription: any;
  updated: boolean;
}

export class SubscriptionReconciler {
  private stripe: Stripe;

  constructor(
    private supabase: SupabaseClient,
    stripeKey: string
  ) {
    this.stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  }

  async reconcile(userId: string): Promise<ReconciliationResult> {
    console.log('[RECONCILER] Starting reconciliation for user:', userId);

    // 1. Get current subscription from database
    const { data: currentSub, error: dbError } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbError && dbError.code !== 'PGRST116') {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('[RECONCILER] Current DB subscription:', currentSub);

    // 2. Get user email
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // 3. Check Stripe
    const stripeData = await this.getStripeSubscription(profile.email);
    console.log('[RECONCILER] Stripe data:', stripeData);

    // 4. Compare and update if needed
    const hasChanges = this.detectChanges(currentSub, stripeData);

    if (hasChanges) {
      console.log('[RECONCILER] Changes detected, updating database');
      await this.updateDatabase(userId, stripeData);
      
      return {
        changes: 1,
        subscription: stripeData,
        updated: true
      };
    }

    console.log('[RECONCILER] No changes needed');
    return {
      changes: 0,
      subscription: currentSub || stripeData,
      updated: false
    };
  }

  private async getStripeSubscription(email: string): Promise<any> {
    // Find customer
    const customers = await this.stripe.customers.list({
      email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return {
        status: 'inactive',
        plan_name: 'Nenhum',
        plan_price: 0,
        expires_at: null,
        stripe_subscription_id: null,
        stripe_price_id: null
      };
    }

    const customer = customers.data[0];

    // Get subscriptions
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1
    });

    if (subscriptions.data.length === 0 || subscriptions.data[0].status !== 'active') {
      return {
        status: 'inactive',
        plan_name: 'Nenhum',
        plan_price: 0,
        expires_at: null,
        stripe_subscription_id: null,
        stripe_price_id: null
      };
    }

    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0].price.id;
    const planDetails = this.mapPlanDetails(priceId);

    return {
      status: 'active',
      plan_name: planDetails.name,
      plan_price: planDetails.price,
      expires_at: new Date(sub.current_period_end * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId
    };
  }

  private detectChanges(currentSub: any, stripeData: any): boolean {
    if (!currentSub) return stripeData.status === 'active';

    return (
      currentSub.status !== stripeData.status ||
      currentSub.stripe_subscription_id !== stripeData.stripe_subscription_id ||
      currentSub.stripe_price_id !== stripeData.stripe_price_id ||
      currentSub.plan_name !== stripeData.plan_name ||
      currentSub.plan_price !== stripeData.plan_price ||
      currentSub.expires_at !== stripeData.expires_at
    );
  }

  private async updateDatabase(userId: string, stripeData: any): Promise<void> {
    await this.supabase.from('subscriptions').upsert({
      user_id: userId,
      status: stripeData.status,
      plan_name: stripeData.plan_name,
      plan_price: stripeData.plan_price,
      expires_at: stripeData.expires_at,
      current_period_end: stripeData.current_period_end,
      stripe_subscription_id: stripeData.stripe_subscription_id,
      stripe_price_id: stripeData.stripe_price_id,
      sync_status: 'reconciled',
      last_webhook_event: 'manual_reconciliation',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

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
}
