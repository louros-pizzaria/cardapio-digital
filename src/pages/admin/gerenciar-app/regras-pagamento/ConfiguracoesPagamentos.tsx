import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConfiguracoesPagamentos() {
  const { settings, isLoading, saveSettings, isSaving } = usePaymentSettings();
  
  const [minOrder, setMinOrder] = useState('15');
  const [maxOrder, setMaxOrder] = useState('500');
  const [autoDiscount, setAutoDiscount] = useState(false);
  const [discountThreshold, setDiscountThreshold] = useState('100');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [allowCoupons, setAllowCoupons] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);

  useEffect(() => {
    if (settings) {
      setMinOrder(settings.general.minOrder.toString());
      setMaxOrder(settings.general.maxOrder.toString());
      setAutoDiscount(settings.general.autoDiscount);
      setDiscountThreshold(settings.general.discountThreshold.toString());
      setDiscountPercent(settings.general.discountPercent.toString());
      setAllowCoupons(settings.general.allowCoupons);
      setRequireLogin(settings.general.requireLogin);
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings) return;
    
    saveSettings({
      online: settings.online,
      inPerson: settings.inPerson,
      general: {
        minOrder: parseFloat(minOrder) || 0,
        maxOrder: parseFloat(maxOrder) || 0,
        autoDiscount,
        discountThreshold: parseFloat(discountThreshold) || 0,
        discountPercent: parseFloat(discountPercent) || 0,
        allowCoupons,
        requireLogin,
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 space-y-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Configurações de Pagamentos</h3>
        <p className="text-sm text-muted-foreground">
          Configure regras gerais de pedidos e descontos
        </p>
      </div>

      <Separator />

      {/* Limites de pedido */}
      <div className="space-y-4">
        <h4 className="font-medium">Limites de Pedido</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min-order">Valor Mínimo (R$)</Label>
            <Input
              id="min-order"
              type="number"
              step="0.01"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-order">Valor Máximo (R$)</Label>
            <Input
              id="max-order"
              type="number"
              step="0.01"
              value={maxOrder}
              onChange={(e) => setMaxOrder(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Descontos automáticos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-discount" className="font-medium">Desconto Progressivo</Label>
            <p className="text-sm text-muted-foreground">
              Aplicar desconto automático para pedidos acima de um valor
            </p>
          </div>
          <Switch 
            id="auto-discount" 
            checked={autoDiscount} 
            onCheckedChange={setAutoDiscount} 
          />
        </div>

        {autoDiscount && (
          <div className="ml-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-threshold">Valor mínimo (R$)</Label>
              <Input
                id="discount-threshold"
                type="number"
                step="0.01"
                value={discountThreshold}
                onChange={(e) => setDiscountThreshold(e.target.value)}
                placeholder="100.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-percent">Desconto (%)</Label>
              <Input
                id="discount-percent"
                type="number"
                step="1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Outras configurações */}
      <div className="space-y-4">
        <h4 className="font-medium">Outras Configurações</h4>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="allow-coupon">Permitir cupons de desconto</Label>
            <p className="text-sm text-muted-foreground">Clientes podem usar cupons</p>
          </div>
          <Switch 
            id="allow-coupon" 
            checked={allowCoupons}
            onCheckedChange={setAllowCoupons}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="require-auth">Exigir login para pedidos</Label>
            <p className="text-sm text-muted-foreground">Cliente deve estar logado</p>
          </div>
          <Switch 
            id="require-auth" 
            checked={requireLogin}
            onCheckedChange={setRequireLogin}
          />
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </Card>
  );
}
