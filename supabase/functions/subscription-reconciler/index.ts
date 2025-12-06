import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-RECONCILER] ${step}${detailsStr}`);
};

interface ReconciliationReport {
  processed: number;
  updated: number;
  deactivated: number;
  activated: number;
  errors: number;
  divergencies: Array<{
    user_id: string;
    issue: string;
    action: string;
    old_value: any;
    new_value: any;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Reconciliation job started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const report: ReconciliationReport = {
      processed: 0,
      updated: 0,
      deactivated: 0,
      activated: 0,
      errors: 0,
      divergencies: []
    };

    // Step 1: Find subscriptions that need reconciliation
    const { data: staleSubs, error: staleError } = await supabaseClient
      .from('subscriptions')
      .select(`
        *,
        profiles!inner(email, stripe_customer_id)
      `)
      .or(`
        last_synced_at.lt.${new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()},
        current_period_end.lt.${new Date().toISOString()},
        status.eq.active
      `)
      .limit(100);

    if (staleError) {
      logStep("Error fetching stale subscriptions", { error: staleError });
      throw staleError;
    }

    logStep("Found subscriptions to reconcile", { count: staleSubs?.length || 0 });

    // Step 2: Process each subscription
    for (const dbSub of staleSubs || []) {
      try {
        report.processed++;
        const profile = Array.isArray(dbSub.profiles) ? dbSub.profiles[0] : dbSub.profiles;
        
        if (!profile?.email) {
          logStep("Skipping subscription without email", { userId: dbSub.user_id });
          continue;
        }

        // Get Stripe customer
        let stripeCustomer = null;
        if (profile.stripe_customer_id) {
          try {
            stripeCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
          } catch (error) {
            logStep("Stripe customer not found by ID, searching by email", { 
              customerId: profile.stripe_customer_id,
              email: profile.email 
            });
          }
        }

        if (!stripeCustomer) {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          stripeCustomer = customers.data[0] || null;
        }

        if (!stripeCustomer) {
          // No Stripe customer = no subscription
          if (dbSub.status === 'active') {
            await supabaseClient
              .from('subscriptions')
              .update({
                status: 'inactive',
                last_synced_at: new Date().toISOString(),
                sync_status: 'reconciled'
              })
              .eq('user_id', dbSub.user_id);

            report.deactivated++;
            report.divergencies.push({
              user_id: dbSub.user_id,
              issue: 'No Stripe customer found',
              action: 'deactivated',
              old_value: dbSub.status,
              new_value: 'inactive'
            });
          }
          continue;
        }

        // Get active Stripe subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
          status: "active",
          limit: 1,
        });

        const stripeSubscription = subscriptions.data[0];
        
        if (!stripeSubscription) {
          // No active subscription in Stripe
          if (dbSub.status === 'active') {
            await supabaseClient
              .from('subscriptions')
              .update({
                status: 'inactive',
                last_synced_at: new Date().toISOString(),
                sync_status: 'reconciled'
              })
              .eq('user_id', dbSub.user_id);

            report.deactivated++;
            report.divergencies.push({
              user_id: dbSub.user_id,
              issue: 'No active Stripe subscription',
              action: 'deactivated',
              old_value: dbSub.status,
              new_value: 'inactive'
            });
          }
          continue;
        }

        // Compare subscription details
        const priceId = stripeSubscription.items.data[0].price.id;
        const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
        const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();

        // Determine plan details
        let planName = 'Desconhecido';
        let planPrice = 0;
        
        const trialPriceId = Deno.env.get("STRIPE_PRICE_ID_TRIAL");
        const monthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
        const annualPriceId = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
        
        if (priceId === trialPriceId) {
          planName = "Trial";
          planPrice = 1.00;
        } else if (priceId === monthlyPriceId) {
          planName = "Mensal";
          planPrice = 9.90;
        } else if (priceId === annualPriceId) {
          planName = "Anual";
          planPrice = 99.90;
        }

        // Check for discrepancies
        const hasDiscrepancies = 
          dbSub.status !== 'active' ||
          dbSub.stripe_subscription_id !== stripeSubscription.id ||
          dbSub.current_period_end !== currentPeriodEnd ||
          dbSub.plan_name !== planName ||
          dbSub.plan_price !== planPrice;

        if (hasDiscrepancies) {
          const updateData = {
            stripe_subscription_id: stripeSubscription.id,
            stripe_price_id: priceId,
            status: 'active',
            plan_name: planName,
            plan_price: planPrice,
            expires_at: currentPeriodEnd,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
            canceled_at: stripeSubscription.canceled_at ? 
              new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
            last_synced_at: new Date().toISOString(),
            sync_status: 'reconciled',
            raw_metadata: {
              stripe_customer_id: stripeCustomer.id,
              subscription_status: stripeSubscription.status,
              reconciled_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          };

          const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .upsert(updateData, { onConflict: 'user_id' });

          if (updateError) {
            logStep("Error updating subscription", { 
              userId: dbSub.user_id, 
              error: updateError 
            });
            report.errors++;
          } else {
            report.updated++;
            if (dbSub.status !== 'active') {
              report.activated++;
            }

            report.divergencies.push({
              user_id: dbSub.user_id,
              issue: 'Subscription data sync',
              action: 'updated',
              old_value: {
                status: dbSub.status,
                plan: dbSub.plan_name,
                expires_at: dbSub.expires_at
              },
              new_value: {
                status: 'active',
                plan: planName,
                expires_at: currentPeriodEnd
              }
            });
          }
        }

        logStep("Processed subscription", {
          userId: dbSub.user_id,
          had_discrepancies: hasDiscrepancies,
          stripe_subscription_id: stripeSubscription.id
        });

      } catch (subError) {
        logStep("Error processing subscription", { 
          userId: dbSub.user_id, 
          error: subError 
        });
        report.errors++;
      }
    }

    // Step 3: Generate summary report
    logStep("Reconciliation completed", report);

    return new Response(JSON.stringify({
      success: true,
      report,
      completed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in subscription-reconciler", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});