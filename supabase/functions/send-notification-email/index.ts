import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  attemptsCount: number;
  timeWindow: string;
  totalRevenue: number;
  uniqueUsers: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar configurações de notificação
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("[NOTIFICATION_EMAIL] Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se notificações por email estão habilitadas
    if (!settings.enabled || !settings.email_notifications || !settings.notification_email) {
      console.log("[NOTIFICATION_EMAIL] Email notifications disabled or no email configured");
      return new Response(
        JSON.stringify({ message: "Email notifications not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar frequência de notificação
    const lastNotification = settings.last_notification_sent_at 
      ? new Date(settings.last_notification_sent_at) 
      : null;
    
    const now = new Date();
    let shouldSend = true;

    if (lastNotification) {
      const timeSinceLastNotification = now.getTime() - lastNotification.getTime();
      const hourInMs = 60 * 60 * 1000;
      const dayInMs = 24 * hourInMs;

      switch (settings.notification_frequency) {
        case "hourly":
          shouldSend = timeSinceLastNotification >= hourInMs;
          break;
        case "daily":
          shouldSend = timeSinceLastNotification >= dayInMs;
          break;
        case "realtime":
          shouldSend = true;
          break;
      }
    }

    if (!shouldSend) {
      console.log("[NOTIFICATION_EMAIL] Skipping notification due to frequency limit");
      return new Response(
        JSON.stringify({ message: "Notification frequency limit not reached" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar estatísticas recentes
    const timeWindow = settings.time_window_minutes || 60;
    const minAttempts = settings.min_attempts_threshold || 3;

    const { data: stats, error: statsError } = await supabase.rpc(
      "get_closed_attempts_stats",
      {
        p_start_date: new Date(now.getTime() - timeWindow * 60 * 1000).toISOString(),
        p_end_date: now.toISOString(),
      }
    );

    if (statsError) {
      console.error("[NOTIFICATION_EMAIL] Error fetching stats:", statsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch stats" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAttempts = Number(stats.total_attempts || 0);

    // Verificar se atingiu o limite mínimo
    if (totalAttempts < minAttempts) {
      console.log(`[NOTIFICATION_EMAIL] Not enough attempts: ${totalAttempts} < ${minAttempts}`);
      return new Response(
        JSON.stringify({ message: "Minimum attempts threshold not reached" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar dados para o email
    const emailData = {
      to: settings.notification_email,
      subject: `⚠️ ${totalAttempts} tentativas de pedido fora do horário`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .stat { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f97316; }
            .stat-label { color: #6b7280; font-size: 14px; }
            .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Alerta de Tentativas Fora do Horário</h1>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Detectamos várias tentativas de pedidos fora do horário de funcionamento nas últimas ${timeWindow} minutos.</p>
              
              <div class="stat">
                <div class="stat-label">Total de Tentativas</div>
                <div class="stat-value">${totalAttempts}</div>
              </div>
              
              <div class="stat">
                <div class="stat-label">Usuários Únicos</div>
                <div class="stat-value">${stats.unique_users || 0}</div>
              </div>
              
              <div class="stat">
                <div class="stat-label">Receita Potencial Perdida</div>
                <div class="stat-value">R$ ${Number(stats.total_lost_revenue || 0).toFixed(2)}</div>
              </div>
              
              <div class="stat">
                <div class="stat-label">Valor Médio do Carrinho</div>
                <div class="stat-value">R$ ${Number(stats.avg_cart_value || 0).toFixed(2)}</div>
              </div>
              
              <p style="margin-top: 20px;">
                <strong>Recomendação:</strong> Considere ajustar seus horários de funcionamento 
                para aproveitar essa demanda ou enviar notificações aos clientes sobre os horários disponíveis.
              </p>
              
              <p style="margin-top: 20px;">
                <a href="https://xpgsfovrxguphlvncgwn.supabase.co" 
                   style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Acessar Painel Admin
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático. Você pode configurar a frequência dessas notificações no painel admin.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Aqui você integraria com seu serviço de email (Resend, SendGrid, etc.)
    // Por enquanto, apenas logamos
    console.log("[NOTIFICATION_EMAIL] Email data prepared:", {
      to: emailData.to,
      totalAttempts,
      uniqueUsers: stats.unique_users,
      revenue: stats.total_lost_revenue,
    });

    // Atualizar timestamp da última notificação
    await supabase
      .from("notification_settings")
      .update({ last_notification_sent_at: now.toISOString() })
      .eq("id", settings.id);

    // TODO: Integrar com serviço de email real (Resend, SendGrid, etc.)
    // Exemplo com Resend:
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send(emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification email prepared",
        emailPrepared: true,
        totalAttempts,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[NOTIFICATION_EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
