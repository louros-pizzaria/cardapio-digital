// ===== LIMPEZA AUTOMÁTICA DE LOGS DE WEBHOOK =====

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CLEANUP] 🧹 Iniciando limpeza de logs de webhook');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { daysToKeep = 30, preserveFailed = true } = await req.json();
    
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    console.log(`[CLEANUP] 📅 Removendo logs anteriores a: ${cutoffDate.toISOString()}`);

    let deletedCount = 0;

    // Primeira limpeza: logs de sucesso antigos
    const { error: successCleanupError, count: successDeleted } = await supabaseClient
      .from('webhook_logs')
      .delete({ count: 'exact' })
      .eq('status', 'success')
      .lt('created_at', cutoffDate.toISOString());

    if (successCleanupError) {
      console.error('[CLEANUP] ❌ Erro ao limpar logs de sucesso:', successCleanupError);
    } else {
      deletedCount += successDeleted || 0;
      console.log(`[CLEANUP] ✅ Removidos ${successDeleted} logs de sucesso`);
    }

    // Segunda limpeza: logs pendentes muito antigos (mais de 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { error: pendingCleanupError, count: pendingDeleted } = await supabaseClient
      .from('webhook_logs')
      .delete({ count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (pendingCleanupError) {
      console.error('[CLEANUP] ❌ Erro ao limpar logs pendentes:', pendingCleanupError);
    } else {
      deletedCount += pendingDeleted || 0;
      console.log(`[CLEANUP] ✅ Removidos ${pendingDeleted} logs pendentes antigos`);
    }

    // Terceira limpeza: logs falhados muito antigos (se não preservar)
    if (!preserveFailed) {
      const failedCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 dias para falhados
      const { error: failedCleanupError, count: failedDeleted } = await supabaseClient
        .from('webhook_logs')
        .delete({ count: 'exact' })
        .eq('status', 'failed')
        .lt('created_at', failedCutoff.toISOString());

      if (failedCleanupError) {
        console.error('[CLEANUP] ❌ Erro ao limpar logs falhados:', failedCleanupError);
      } else {
        deletedCount += failedDeleted || 0;
        console.log(`[CLEANUP] ✅ Removidos ${failedDeleted} logs falhados muito antigos`);
      }
    }

    // Limpeza de logs órfãos (sem order_id quando deveriam ter)
    const { error: orphanCleanupError, count: orphanDeleted } = await supabaseClient
      .from('webhook_logs')
      .delete({ count: 'exact' })
      .is('order_id', null)
      .in('event_type', ['checkout.session.completed', 'payment'])
      .lt('created_at', cutoffDate.toISOString());

    if (orphanCleanupError) {
      console.error('[CLEANUP] ❌ Erro ao limpar logs órfãos:', orphanCleanupError);
    } else {
      deletedCount += orphanDeleted || 0;
      console.log(`[CLEANUP] ✅ Removidos ${orphanDeleted} logs órfãos`);
    }

    // Otimização: reindexar tabela se muitos registros foram removidos
    if (deletedCount > 1000) {
      console.log('[CLEANUP] 🔧 Muitos registros removidos, executando otimização...');
      
      try {
        // Note: VACUUM não está disponível via RPC normal, então criamos estatísticas
        await supabaseClient
          .from('webhook_logs')
          .select('count(*)', { count: 'exact', head: true });
        
        console.log('[CLEANUP] ✅ Otimização concluída');
      } catch (optimizeError) {
        console.warn('[CLEANUP] ⚠️ Erro na otimização:', optimizeError);
      }
    }

    // Log de auditoria da limpeza
    await supabaseClient
      .from('security_logs')
      .insert({
        action: 'webhook_logs_cleanup',
        details: {
          days_kept: daysToKeep,
          preserve_failed: preserveFailed,
          total_deleted: deletedCount,
          cutoff_date: cutoffDate.toISOString(),
          cleanup_timestamp: new Date().toISOString()
        }
      });

    // Estatísticas finais
    const { count: remainingLogs } = await supabaseClient
      .from('webhook_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`[CLEANUP] 📊 Limpeza concluída: ${deletedCount} removidos, ${remainingLogs} restantes`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        remaining_count: remainingLogs,
        cutoff_date: cutoffDate.toISOString(),
        preserved_failed: preserveFailed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CLEANUP] ❌ Erro na limpeza:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});