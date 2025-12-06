// ===== VALIDAÇÃO DE ASSINATURA EM TEMPO REAL =====

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[VALIDATION] 🔒 Iniciando validação de assinatura em tempo real');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Autenticar usuário
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.log('[VALIDATION] ❌ Usuário não autenticado');
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          reason: 'Usuário não autenticado' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userId, currentStatus } = await req.json();
    console.log(`[VALIDATION] 👤 Validando para usuário: ${userId}`);

    // 1. Verificar assinatura no banco local
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[VALIDATION] ❌ Erro ao buscar assinatura:', subError);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          reason: 'Erro interno na validação' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Se não encontrou assinatura ativa localmente
    if (!subscription) {
      console.log('[VALIDATION] ⚠️ Nenhuma assinatura ativa encontrada localmente');
      
      // Verificar no Stripe como backup
      try {
        const stripeValidation = await validateWithStripe(userId, supabaseClient);
        if (stripeValidation.isValid) {
          console.log('[VALIDATION] ✅ Assinatura válida no Stripe, atualizando localmente');
          return new Response(
            JSON.stringify(stripeValidation),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (stripeError) {
        console.error('[VALIDATION] ❌ Erro na validação Stripe:', stripeError);
      }

      return new Response(
        JSON.stringify({ 
          isValid: false, 
          reason: 'Nenhuma assinatura ativa encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar se a assinatura não expirou
    if (subscription.expires_at) {
      const expirationDate = new Date(subscription.expires_at);
      const now = new Date();
      
      if (expirationDate <= now) {
        console.log('[VALIDATION] ⏰ Assinatura expirada, bloqueando acesso');
        
        // Atualizar status para expirado
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id);

        // Log de auditoria
        await supabaseClient
          .from('security_logs')
          .insert({
            user_id: userId,
            action: 'subscription_expired',
            details: {
              subscription_id: subscription.id,
              expired_at: subscription.expires_at,
              blocked_at: now.toISOString()
            }
          });

        return new Response(
          JSON.stringify({ 
            isValid: false, 
            reason: 'Assinatura expirada',
            expiresAt: subscription.expires_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Verificação adicional com Stripe (se necessário)
    let stripeValidation = null;
    if (subscription.sync_status === 'manual' || 
        subscription.stripe_subscription_id) {
      
      try {
        stripeValidation = await validateWithStripe(userId, supabaseClient);
        
        // Se Stripe diz que não é válida, mas local diz que é, priorizar Stripe
        if (!stripeValidation.isValid) {
          console.log('[VALIDATION] ⚠️ Conflito entre local e Stripe, priorizando Stripe');
          
          // Atualizar status local
          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'cancelled',
              sync_status: 'conflict_resolved'
            })
            .eq('id', subscription.id);

          return new Response(
            JSON.stringify(stripeValidation),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (stripeError) {
        console.warn('[VALIDATION] ⚠️ Falha na validação Stripe, usando dados locais:', stripeError);
      }
    }

    // 5. Log de auditoria para validação bem-sucedida
    await supabaseClient
      .from('security_logs')
      .insert({
        user_id: userId,
        action: 'subscription_validation_success',
        details: {
          validation_type: 'realtime',
          subscription_id: subscription.id,
          plan_name: subscription.plan_name,
          expires_at: subscription.expires_at,
          stripe_verified: !!stripeValidation
        }
      });

    console.log('[VALIDATION] ✅ Validação bem-sucedida');

    return new Response(
      JSON.stringify({ 
        isValid: true,
        reason: 'Assinatura válida',
        expiresAt: subscription.expires_at,
        planName: subscription.plan_name,
        stripeVerified: !!stripeValidation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VALIDATION] ❌ Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        reason: 'Erro interno na validação' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ===== VALIDAÇÃO COM STRIPE =====
async function validateWithStripe(userId: string, supabaseClient: any) {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }

  // Buscar perfil do usuário para obter email
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    throw new Error('User email not found');
  }

  // Buscar customer no Stripe
  const customerResponse = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(profile.email)}`,
    {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const customerData = await customerResponse.json();
  
  if (!customerData.data || customerData.data.length === 0) {
    return { isValid: false, reason: 'Cliente não encontrado no Stripe' };
  }

  const customerId = customerData.data[0].id;

  // Buscar assinaturas ativas
  const subscriptionsResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active`,
    {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const subscriptionsData = await subscriptionsResponse.json();

  if (!subscriptionsData.data || subscriptionsData.data.length === 0) {
    return { isValid: false, reason: 'Nenhuma assinatura ativa no Stripe' };
  }

  const activeSubscription = subscriptionsData.data[0];
  const expiresAt = new Date(activeSubscription.current_period_end * 1000);

  return {
    isValid: true,
    reason: 'Assinatura válida no Stripe',
    expiresAt: expiresAt.toISOString(),
    stripeSubscriptionId: activeSubscription.id
  };
}