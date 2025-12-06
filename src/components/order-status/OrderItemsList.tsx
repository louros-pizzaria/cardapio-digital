import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { formatExtraNames } from '@/utils/orderStatusHelpers';

interface OrderItemsListProps {
  items: any[];
  getCrustName: (customizations: any) => string | null;
}

export const OrderItemsList = ({ items, getCrustName }: OrderItemsListProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const renderCustomizations = (customizations: any) => {
    if (!customizations) return null;

    const customizationsList: string[] = [];

    if (customizations.size) {
      customizationsList.push(`Tamanho: ${customizations.size}`);
    }
    if (customizations.crust) {
      const crustName = getCrustName(customizations);
      if (crustName) {
        customizationsList.push(`Borda recheada: ${crustName}`);
      }
    }
    if (customizations.extras && customizations.extras.length > 0) {
      const formattedExtras = formatExtraNames(customizations.extras);
      customizationsList.push(`Adicionais: ${formattedExtras.join(', ')}`);
    }
    if (customizations.notes) {
      customizationsList.push(`Obs: ${customizations.notes}`);
    }

    if (customizationsList.length === 0) return null;

    return (
      <div className="mt-1 space-y-0.5">
        {customizationsList.map((custom, index) => (
          <p key={index} className="text-xs text-muted-foreground">
            • {custom}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base text-foreground">Itens do Pedido</h3>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.quantity}x
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.products?.name || 'Produto'}
                      </p>
                      {renderCustomizations(item.customizations)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatPrice(item.total_price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(item.unit_price)} / un
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
