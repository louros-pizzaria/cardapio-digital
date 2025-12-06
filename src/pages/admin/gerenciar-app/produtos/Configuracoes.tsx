import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductSettings } from '@/hooks/useProductSettings';

export function Configuracoes() {
  const { settings, isLoading, updateSettings, isUpdating } = useProductSettings();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
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
        <h2 className="text-2xl font-bold mb-2">Configurações de Produtos</h2>
        <p className="text-muted-foreground">
          Configure regras globais para produtos
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Estoque */}
        <div className="space-y-4">
          <h3 className="font-semibold">Controle de Estoque</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="stock-control">Ativar controle de estoque</Label>
              <p className="text-sm text-muted-foreground">
                Produtos ficarão indisponíveis quando estoque zerar
              </p>
            </div>
            <Switch 
              id="stock-control"
              checked={settings.stock_control_enabled}
              onCheckedChange={(checked) => updateSettings({ stock_control_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="low-stock">Alerta de estoque baixo</Label>
            <Input
              id="low-stock"
              type="number"
              min="0"
              value={settings.low_stock_threshold}
              onChange={(e) => updateSettings({ low_stock_threshold: parseInt(e.target.value) })}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Notificar quando estoque estiver abaixo deste valor
            </p>
          </div>
        </div>

        {/* Disponibilidade */}
        <div className="space-y-4">
          <h3 className="font-semibold">Disponibilidade</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-disable">Desativar automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Produtos sem estoque serão automaticamente desativados
              </p>
            </div>
            <Switch 
              id="auto-disable"
              checked={settings.auto_disable_out_of_stock}
              onCheckedChange={(checked) => updateSettings({ auto_disable_out_of_stock: checked })}
            />
          </div>
        </div>

        {/* Preços */}
        <div className="space-y-4">
          <h3 className="font-semibold">Preços</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-old-price">Exibir preço anterior</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar preço riscado quando houver promoção
              </p>
            </div>
            <Switch 
              id="show-old-price"
              checked={settings.show_old_price_on_sale}
              onCheckedChange={(checked) => updateSettings({ show_old_price_on_sale: checked })}
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
