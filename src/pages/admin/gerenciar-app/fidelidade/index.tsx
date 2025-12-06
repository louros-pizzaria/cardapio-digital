import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoyaltySettings } from '@/hooks/useLoyaltySettings';

export default function Fidelidade() {
  const { settings, isLoading, updateSettings, isUpdating } = useLoyaltySettings();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Sistema de Fidelidade</h2>
        <p className="text-muted-foreground">
          Configure pontos e recompensas para seus clientes
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Ativar sistema */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="loyalty-active">Ativar programa de fidelidade</Label>
            <p className="text-sm text-muted-foreground">
              Clientes ganham pontos a cada compra
            </p>
          </div>
          <Switch 
            id="loyalty-active"
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          />
        </div>

        <Separator />

        {/* Configuração de pontos */}
        <div className="space-y-4">
          <h3 className="font-semibold">Acúmulo de Pontos</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points-per-real">Pontos por R$ 1,00</Label>
              <Input
                id="points-per-real"
                type="number"
                step="0.1"
                min="0"
                value={settings.points_per_real}
                onChange={(e) => updateSettings({ points_per_real: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-purchase">Compra mínima (R$)</Label>
              <Input
                id="min-purchase"
                type="number"
                step="0.01"
                min="0"
                value={settings.min_purchase}
                onChange={(e) => updateSettings({ min_purchase: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Resgatar pontos */}
        <div className="space-y-4">
          <h3 className="font-semibold">Resgate de Pontos</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points-to-discount">Pontos para desconto</Label>
              <Input
                id="points-to-discount"
                type="number"
                min="1"
                value={settings.points_to_discount}
                onChange={(e) => updateSettings({ points_to_discount: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Quantos pontos equivalem a R$ 1,00 de desconto
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-discount">Desconto máximo (%)</Label>
              <Input
                id="max-discount"
                type="number"
                min="0"
                max="100"
                value={settings.max_discount_percent}
                onChange={(e) => updateSettings({ max_discount_percent: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Bônus */}
        <div className="space-y-4">
          <h3 className="font-semibold">Bônus Especiais</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="birthday-bonus">Bônus de aniversário</Label>
              <p className="text-sm text-muted-foreground">
                Pontos extras no mês do aniversário
              </p>
            </div>
            <Input
              id="birthday-bonus"
              type="number"
              min="0"
              value={settings.birthday_bonus}
              onChange={(e) => updateSettings({ birthday_bonus: parseInt(e.target.value) })}
              className="w-24"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="first-purchase-bonus">Primeira compra</Label>
              <p className="text-sm text-muted-foreground">
                Bônus para novos clientes
              </p>
            </div>
            <Input
              id="first-purchase-bonus"
              type="number"
              min="0"
              value={settings.first_purchase_bonus}
              onChange={(e) => updateSettings({ first_purchase_bonus: parseInt(e.target.value) })}
              className="w-24"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Configurações salvas automaticamente'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
