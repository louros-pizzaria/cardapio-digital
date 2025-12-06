import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[DEBUG-SUBSCRIPTION] ${step}${detailsStr}`);
};

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
    logStep("Debug function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message || 'No user found'}`);
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user can debug (admin or own user)
    const { data: body } = await req.json().catch(() => ({ data: {} }));
    const targetUserId = body?.target_user_id || user.id;
    
    // Validate admin permission if debugging another user
    if (targetUserId !== user.id) {
      const { data: isAdmin } = await supabaseClient
        .rpc('has_role', { _role: 'admin' })
        .single();
      
      if (!isAdmin) {
        throw new Error('Only admins can debug other users');
      }
      
      logStep("Admin debugging another user", { adminId: user.id, targetUserId });
    }

    const debugUserId = targetUserId;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Step 1: Check current database state
    const { data: currentSub, error: dbError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', debugUserId)
      .single();

    logStep("Current database subscription", { 
      found: !!currentSub, 
      error: dbError?.message,
      subscription: currentSub 
    });

    // Step 2: Check user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', debugUserId)
      .single();

    logStep("User profile", { 
      found: !!profile, 
      error: profileError?.message,
      profile: profile ? {
        email: profile.email,
        stripe_customer_id: profile.stripe_customer_id
      } : null
    });

    // Step 3: Check Stripe customers by email
    const targetEmail = profile?.email || user.email;
    const customers = await stripe.customers.list({ email: targetEmail, limit: 10 });
    logStep("Stripe customers found", { 
      count: customers.data.length,
      customers: customers.data.map((c: any) => ({
        id: c.id,
        email: c.email,
        created: new Date(c.created * 1000).toISOString()
      }))
    });

    let allSubscriptions: any[] = [];
    
    // Step 4: Check subscriptions for each customer
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
      });
      
      const customerSubs = subscriptions.data.map((sub: any) => ({
        id: sub.id,
        customer_id: customer.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        price_id: sub.items.data[0]?.price.id,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null
      }));
      
      allSubscriptions.push(...customerSubs);
      
      logStep(`Subscriptions for customer ${customer.id}`, {
        count: customerSubs.length,
        subscriptions: customerSubs
      });
    }

    // Step 5: Check RLS policies
    const { data: policies } = await supabaseClient
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'subscriptions');

    logStep("RLS policies for subscriptions table", { 
      count: policies?.length || 0,
      policies: policies?.map(p => ({
        policyname: p.policyname,
        cmd: p.cmd,
        permissive: p.permissive,
        qual: p.qual,
        with_check: p.with_check
      }))
    });

    // Step 6: Test upsert operation
    if (allSubscriptions.length > 0) {
      const activeSub = allSubscriptions.find(s => s.status === 'active');
      if (activeSub) {
        logStep("Testing upsert operation with active subscription", { subscriptionId: activeSub.id });
        
        try {
          const testData = {
            user_id: user.id,
            stripe_subscription_id: activeSub.id,
            stripe_price_id: activeSub.price_id,
            status: 'active',
            plan_name: 'Test Plan',
            plan_price: 99.90,
            expires_at: activeSub.current_period_end,
            sync_status: 'debug',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: upsertResult, error: upsertError } = await supabaseClient
            .from('subscriptions')
            .upsert(testData, { onConflict: 'user_id' })
            .select();

          if (upsertError) {
            logStep("Upsert failed", { error: upsertError });
          } else {
            logStep("Upsert successful", { result: upsertResult });
          }
        } catch (error) {
          logStep("Upsert operation error", { error });
        }
      }
    }

    // Step 7: Check audit logs
    const { data: auditLogs } = await supabaseClient
      .from('subscription_audit_logs')
      .select('*')
      .eq('user_id', debugUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    logStep("Recent audit logs", { 
      count: auditLogs?.length || 0,
      logs: auditLogs 
    });

    // Summary
    const summary = {
      user: {
        id: debugUserId,
        email: targetEmail,
        debugged_by: user.id !== debugUserId ? user.id : undefined
      },
      database_subscription: currentSub,
      stripe_customers_count: customers.data.length,
      stripe_subscriptions_count: allSubscriptions.length,
      active_subscriptions: allSubscriptions.filter(s => s.status === 'active'),
      profile_has_stripe_id: !!profile?.stripe_customer_id,
      rls_policies_count: policies?.length || 0,
      audit_logs_count: auditLogs?.length || 0
    };

    return new Response(JSON.stringify({
      success: true,
      summary,
      details: {
        database_subscription: currentSub,
        profile,
        stripe_customers: customers.data,
        stripe_subscriptions: allSubscriptions,
        rls_policies: policies,
        audit_logs: auditLogs
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in debug-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});