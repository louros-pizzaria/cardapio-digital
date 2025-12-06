// ===== RECONCILE SUBSCRIPTION - SIMPLIFICADO =====

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SubscriptionReconciler } from "../_shared/reconciler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RECONCILE-SUBSCRIPTION] Request received');

    // 1. Validate environment
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // 2. Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 3. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json(
        { success: false, error: "Missing authorization" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('[RECONCILE-SUBSCRIPTION] User authenticated:', user.id);

    // 4. Reconcile subscription
    const reconciler = new SubscriptionReconciler(supabase, stripeKey);
    const result = await reconciler.reconcile(user.id);

    console.log('[RECONCILE-SUBSCRIPTION] Result:', result);

    return Response.json({
      success: true,
      changes: result.changes,
      updated: result.updated,
      subscription: {
        subscribed: result.subscription?.status === 'active',
        status: result.subscription?.status || 'inactive',
        plan_name: result.subscription?.plan_name || 'Nenhum',
        plan_price: result.subscription?.plan_price || 0,
        expires_at: result.subscription?.expires_at || null,
        reconciled_at: new Date().toISOString()
      }
    }, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('[RECONCILE-SUBSCRIPTION] Error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
});
