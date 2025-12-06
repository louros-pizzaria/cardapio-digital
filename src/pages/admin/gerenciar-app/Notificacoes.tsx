import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Mail, Clock, TrendingUp, Users, DollarSign, BarChart3, AlertCircle, Send } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useStoreClosedAttempts } from '@/hooks/useStoreClosedAttempts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Notificacoes() {
  const { settings, isLoading, updateSettings, isUpdating } = useNotificationSettings();
  const [email, setEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Últimos 30 dias
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();
  const { attempts, stats, isLoading: isLoadingData } = useStoreClosedAttempts(startDate, endDate);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSaveSettings = () => {
    const updates: any = {};
    
    if (email && email !== settings?.notification_email) {
      updates.notification_email = email;
    }

    if (Object.keys(updates).length > 0) {
      updateSettings(updates);
    }
  };

  const handleTestNotification = async () => {
    if (!settings?.notification_email) {
      toast.error('Configure um email antes de testar a notificação');
      return;
    }

    setIsSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          attemptsCount: stats?.total_attempts || 10,
          timeWindow: '60 minutos',
          totalRevenue: stats?.total_lost_revenue || 500,
          uniqueUsers: stats?.unique_users || 5,
        }
      });

      if (error) throw error;

      toast.success('Notificação de teste enviada! Verifique seu email.');
    } catch (error: any) {
      console.error('[TEST_NOTIFICATION] Error:', error);
      toast.error(`Erro ao enviar: ${error.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Notificações de Tentativas</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe e configure alertas para tentativas de pedidos fora do horário
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Tentativas
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_attempts || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Únicos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_users || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Usuários diferentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Perdida
              </CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(Number(stats.total_lost_revenue) || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Valor total dos carrinhos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Number(stats.avg_cart_value) || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por tentativa</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights */}
      {stats && stats.most_common_hour !== null && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 dark:text-blue-100">Insight de Demanda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800 dark:text-blue-200">
              O horário com <strong>mais tentativas de pedidos</strong> foi às{' '}
              <strong>{stats.most_common_hour}:00h</strong>.{' '}
              {stats.most_common_hour >= 22 || stats.most_common_hour <= 6 ? (
                <span>Considere estender o horário de funcionamento para atender essa demanda.</span>
              ) : (
                <span>Há demanda significativa nesse horário.</span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificações
          </CardTitle>
          <CardDescription>
            Configure como e quando deseja ser notificado sobre tentativas fora do horário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar/Desativar Sistema */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sistema de Notificações</Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar todas as notificações
              </p>
            </div>
            <Switch
              checked={settings?.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          {/* Notificações por Email */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Notificações por Email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas por email quando houver tentativas
                </p>
              </div>
              <Switch
                checked={settings?.email_notifications}
                onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
                disabled={isUpdating || !settings?.enabled}
              />
            </div>

            {settings?.email_notifications && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="notification-email">Email para notificações</Label>
                <div className="flex gap-2">
                  <Input
                    id="notification-email"
                    type="email"
                    placeholder="seu-email@exemplo.com"
                    value={email || settings?.notification_email || ''}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isUpdating}
                  />
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isUpdating || !email}
                  >
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings?.notification_email ? (
                    <>Email atual: {settings.notification_email}</>
                  ) : (
                    <>Nenhum email configurado</>
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Notificações In-App */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações no Sistema</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar alertas dentro da plataforma
              </p>
            </div>
            <Switch
              checked={settings?.in_app_notifications}
              onCheckedChange={(checked) => updateSettings({ in_app_notifications: checked })}
              disabled={isUpdating || !settings?.enabled}
            />
          </div>

          <Separator />

          {/* Frequência */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequência de Notificações</Label>
            <Select
              value={settings?.notification_frequency}
              onValueChange={(value) =>
                updateSettings({ notification_frequency: value as any })
              }
              disabled={isUpdating || !settings?.enabled}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Tempo Real</SelectItem>
                <SelectItem value="hourly">A cada hora</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings?.notification_frequency === 'realtime' && 'Você receberá uma notificação para cada tentativa'}
              {settings?.notification_frequency === 'hourly' && 'Você receberá um resumo a cada hora'}
              {settings?.notification_frequency === 'daily' && 'Você receberá um resumo diário'}
            </p>
          </div>

          <Separator />

          {/* Limite de Tentativas */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Limite de Tentativas</Label>
            <Input
              id="threshold"
              type="number"
              min="1"
              max="100"
              value={settings?.min_attempts_threshold}
              onChange={(e) =>
                updateSettings({ min_attempts_threshold: parseInt(e.target.value) })
              }
              disabled={isUpdating || !settings?.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Notificar apenas após este número de tentativas na janela de tempo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Histórico Recente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tentativas Recentes
          </CardTitle>
          <CardDescription>Últimas 20 tentativas de pedidos fora do horário</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !attempts || attempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma tentativa registrada nos últimos 30 dias</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.slice(0, 20).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {attempt.user_name || attempt.user_email || 'Visitante'}
                      </p>
                      {attempt.cart_value && (
                        <Badge variant="secondary">
                          {formatCurrency(attempt.cart_value)}
                        </Badge>
                      )}
                      {attempt.cart_items_count && (
                        <Badge variant="outline">{attempt.cart_items_count} itens</Badge>
                      )}
                    </div>
                    {attempt.user_phone && (
                      <p className="text-sm text-muted-foreground">{attempt.user_phone}</p>
                    )}
                    {attempt.next_opening && (
                      <p className="text-xs text-muted-foreground">
                        Próxima abertura: {attempt.next_opening}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">
                      {format(new Date(attempt.attempted_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {attempt.source}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
