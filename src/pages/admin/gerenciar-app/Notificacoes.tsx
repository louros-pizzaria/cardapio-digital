import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Mail } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Notificacoes() {
  const { settings, isLoading, updateSettings, isUpdating } = useNotificationSettings();
  const [email, setEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSaveSettings = () => {
    const updates: any = {};
    
    if (email && email !== settings?.notification_email) {
      updates.notification_email = email;
    }

    if (Object.keys(updates).length > 0) {
      updateSettings(updates);
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
    </div>
  );
}
