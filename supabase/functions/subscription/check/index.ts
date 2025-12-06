// ===== CHECK SUBSCRIPTION - REFATORADO =====

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SubscriptionChecker } from "../_shared/subscription-checker.ts";
import { RateLimiter } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CHECK-SUBSCRIPTION] Request received');

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
      console.warn('[CHECK-SUBSCRIPTION] Missing authorization header');
      return Response.json(
        {
          error: "Missing authorization",
          subscribed: false,
          status: 'unauthenticated'
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn('[CHECK-SUBSCRIPTION] Authentication failed:', authError);
      return Response.json(
        {
          error: "Unauthorized",
          subscribed: false,
          status: 'unauthenticated'
        },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('[CHECK-SUBSCRIPTION] User authenticated:', user.id);

    // 4. Rate limiting (5 requests per minute per user)
    const rateLimiter = new RateLimiter(supabase);
    const allowed = await rateLimiter.check(user.id, 5, 60);

    if (!allowed) {
      console.warn('[CHECK-SUBSCRIPTION] Rate limit exceeded for user:', user.id);
      return Response.json(
        {
          error: "Rate limit exceeded",
          subscribed: false,
          status: 'rate_limited'
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // 5. Check subscription using unified checker
    const checker = new SubscriptionChecker(supabase, stripeKey);
    const result = await checker.check(user.id);

    console.log('[CHECK-SUBSCRIPTION] Result:', result);

    return Response.json(result, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('[CHECK-SUBSCRIPTION] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal error",
        subscribed: false,
        status: 'error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
});
