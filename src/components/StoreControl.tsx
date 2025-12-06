import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { Store, DollarSign, Clock, ShieldCheck } from 'lucide-react';

interface StoreSettings {
  id: string;
  is_open: boolean;
  auto_accept_orders: boolean;
  min_order_value: number;
  max_order_value: number;
  estimated_prep_time: number;
  closed_message: string;
}

export const StoreControl = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações da loja');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          is_open: settings.is_open,
          auto_accept_orders: settings.auto_accept_orders,
          min_order_value: settings.min_order_value,
          max_order_value: settings.max_order_value,
          estimated_prep_time: settings.estimated_prep_time,
          closed_message: settings.closed_message,
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleStoreStatus = async () => {
    if (!settings) return;

    const newStatus = !settings.is_open;
    setSettings({ ...settings, is_open: newStatus });

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({ is_open: newStatus })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success(newStatus ? 'Loja aberta!' : 'Loja fechada!', {
        description: newStatus 
          ? 'Pedidos podem ser recebidos normalmente' 
          : 'Novos pedidos serão bloqueados',
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setSettings({ ...settings, is_open: !newStatus });
      toast.error('Erro ao alterar status da loja');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Status da Loja */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              <CardTitle>Status da Loja</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${settings.is_open ? 'text-green-600' : 'text-red-600'}`}>
                {settings.is_open ? 'ABERTA' : 'FECHADA'}
              </span>
              <Switch
                checked={settings.is_open}
                onCheckedChange={toggleStoreStatus}
              />
            </div>
          </div>
          <CardDescription>
            {settings.is_open 
              ? 'A loja está aceitando pedidos' 
              : 'A loja não está aceitando novos pedidos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="closed-message">Mensagem quando fechada</Label>
              <Textarea
                id="closed-message"
                value={settings.closed_message}
                onChange={(e) => setSettings({ ...settings, closed_message: e.target.value })}
                placeholder="Digite a mensagem que será exibida quando a loja estiver fechada"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Pedidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle>Configurações de Pedidos</CardTitle>
          </div>
          <CardDescription>
            Defina como os pedidos serão processados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-aceitar pedidos</Label>
              <p className="text-sm text-muted-foreground">
                Pedidos serão confirmados automaticamente
              </p>
            </div>
            <Switch
              checked={settings.auto_accept_orders}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, auto_accept_orders: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Valores e Limites */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Valores e Limites</CardTitle>
          </div>
          <CardDescription>
            Configure valores mínimo e máximo para pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-value">Valor Mínimo (R$)</Label>
              <Input
                id="min-value"
                type="number"
                step="0.01"
                min="0"
                value={settings.min_order_value}
                onChange={(e) => 
                  setSettings({ ...settings, min_order_value: parseFloat(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="max-value">Valor Máximo (R$)</Label>
              <Input
                id="max-value"
                type="number"
                step="0.01"
                min="0"
                value={settings.max_order_value}
                onChange={(e) => 
                  setSettings({ ...settings, max_order_value: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tempo de Preparo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Tempo de Preparo</CardTitle>
          </div>
          <CardDescription>
            Tempo estimado para preparar pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="prep-time">Tempo estimado (minutos)</Label>
            <Input
              id="prep-time"
              type="number"
              min="0"
              value={settings.estimated_prep_time}
              onChange={(e) => 
                setSettings({ ...settings, estimated_prep_time: parseInt(e.target.value) })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
};
