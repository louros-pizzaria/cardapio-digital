// ===== DASHBOARD DE MONITORAMENTO DE WEBHOOKS =====

import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WebhookLog {
  id: string;
  platform: string;
  event_type: string;
  status: string;
  created_at: string;
  processed_at?: string;
  error_message?: string;
  order_id?: string;
  payload: any;
  signature?: string;
}

interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
  avgProcessingTime: number;
}

export function WebhookLogs() {
  const { user } = useUnifiedAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<WebhookStats>({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    successRate: 0,
    avgProcessingTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ===== CARREGAR LOGS =====
  const loadWebhookLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedPlatform !== 'all') {
        query = query.eq('platform', selectedPlatform);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
      
      // Calcular estatísticas
      const total = data?.length || 0;
      const success = data?.filter(log => log.status === 'success').length || 0;
      const failed = data?.filter(log => log.status === 'failed').length || 0;
      const pending = data?.filter(log => log.status === 'pending').length || 0;
      const successRate = total > 0 ? (success / total) * 100 : 0;
      
      // Calcular tempo médio de processamento
      const processedLogs = data?.filter(log => log.processed_at && log.created_at) || [];
      const avgProcessingTime = processedLogs.length > 0 
        ? processedLogs.reduce((acc, log) => {
            const created = new Date(log.created_at).getTime();
            const processed = new Date(log.processed_at!).getTime();
            return acc + (processed - created);
          }, 0) / processedLogs.length / 1000 // em segundos
        : 0;

      setStats({
        total,
        success,
        failed,
        pending,
        successRate,
        avgProcessingTime
      });

    } catch (error: any) {
      console.error('Erro ao carregar logs de webhook:', error);
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== REPROCESSAR WEBHOOK =====
  const reprocessWebhook = async (logId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reprocess-webhook', {
        body: { logId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Webhook reprocessado",
        description: "O webhook foi adicionado à fila para reprocessamento.",
      });

      // Recarregar logs
      await loadWebhookLogs();

    } catch (error: any) {
      toast({
        title: "Erro ao reprocessar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ===== LIMPAR LOGS ANTIGOS =====
  const cleanOldLogs = async () => {
    try {
      const { error } = await supabase.functions.invoke('cleanup-webhook-logs', {
        body: { daysToKeep: 30 },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Logs limpos",
        description: "Logs antigos foram removidos com sucesso.",
      });

      await loadWebhookLogs();

    } catch (error: any) {
      toast({
        title: "Erro na limpeza",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ===== EFEITOS =====
  useEffect(() => {
    loadWebhookLogs();
  }, [user, selectedPlatform]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadWebhookLogs();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, selectedPlatform]);

  // ===== UTILITÁRIOS =====
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'retrying': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary',
      retrying: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.successRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Falhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgProcessingTime.toFixed(1)}s
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CONTROLES */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Todas as Plataformas</option>
            <option value="stripe">Stripe</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="delivery">Delivery</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadWebhookLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button variant="outline" size="sm" onClick={cleanOldLogs}>
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* ALERTAS */}
      {stats.failed > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.failed} webhooks falharam recentemente. Verifique os logs abaixo.
          </AlertDescription>
        </Alert>
      )}

      {/* LOGS */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Webhooks</CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos webhooks recebidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log de webhook encontrado
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(log.status)}
                      <span className="font-medium">{log.platform}</span>
                      <span className="text-sm text-muted-foreground">
                        {log.event_type}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                      
                      {log.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reprocessWebhook(log.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reprocessar
                        </Button>
                      )}
                    </div>
                  </div>

                  {log.order_id && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Pedido: </span>
                      <code className="bg-muted px-1 rounded">{log.order_id}</code>
                    </div>
                  )}

                  {log.error_message && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {log.error_message}
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver payload
                    </summary>
                    <pre className="bg-muted p-2 rounded mt-2 overflow-x-auto text-xs">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}