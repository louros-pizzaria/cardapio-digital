import { Badge } from "@/components/ui/badge";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";

interface StripeItemsListAlternativeProps {
  items: any[];
  loading?: boolean;
}

export const StripeItemsListAlternative = ({ items, loading }: StripeItemsListAlternativeProps) => {
  const { crustById, crustByName, extraByName, loading: pricingLoading } = useCatalogPricing();

  const getCrustPrice = (crustName: string): number => {
    if (!crustName) return 0;
    const crust = crustByName[crustName];
    return crust?.price || 0;
  };

  const getExtraPrice = (extraName: string): number => {
    if (!extraName) return 0;
    const extra = extraByName[extraName];
    return extra?.price || 0;
  };

  if (loading || pricingLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="text-4xl mb-3">📦</div>
        <p className="text-sm">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item: any, index: number) => {
        const crustPriceUnit = item.customizations?.crust
          ? (crustById[item.customizations.crust]?.price ?? (item.customizations?.crustName ? getCrustPrice(item.customizations.crustName) : 0))
          : (item.customizations?.crustName ? getCrustPrice(item.customizations.crustName) : 0);
        
        const extrasTotalUnit = (item.customizations?.extrasNames || [])
          .reduce((sum: number, extraName: string) => sum + getExtraPrice(extraName), 0);

        const basePrice = item.unit_price;
        const itemSubtotal = basePrice * item.quantity;
        const crustPrice = crustPriceUnit * item.quantity;
        const extrasTotal = extrasTotalUnit * item.quantity;
        const calculatedTotal = itemSubtotal + crustPrice + extrasTotal;

        const categoryName = item.products?.categories?.name || 'Produtos';
        const productDescription = item.products?.description || item.products?.ingredients?.join(', ');

        return (
          <div
            key={index}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Header com Categoria */}
            <div className="bg-muted/50 px-6 py-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {categoryName}
              </h4>
            </div>

            <div className="p-6 space-y-4">
              {/* Badges + Quantidade/Preço */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {item.products?.categories?.name && (
                    <Badge variant="secondary" className="text-xs">
                      {item.products.categories.name}
                    </Badge>
                  )}
                  {item.customizations?.size && (
                    <Badge variant="secondary" className="text-xs">
                      {item.customizations.size}
                    </Badge>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-muted-foreground">
                    Qtd: <span className="font-medium text-foreground">{item.quantity}</span>
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    R$ {calculatedTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Nome do Produto */}
              <h3 className="text-lg font-bold text-foreground leading-tight">
                {item.products?.name || 'Produto'}
              </h3>

              {/* Descrição/Ingredientes */}
              {productDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {productDescription}
                </p>
              )}

              {/* Borda Recheada - Box Destacado */}
              {item.customizations?.crustName && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    🍕 Borda recheada: <span className="font-normal">{item.customizations.crustName.replace(/^(borda recheada -?|borda -?)/i, '').trim()}</span>
                  </p>
              {crustPriceUnit > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  + R$ {crustPriceUnit.toFixed(2)} {item.quantity > 1 && `x ${item.quantity}`} = R$ {crustPrice.toFixed(2)}
                </p>
              )}
                </div>
              )}

              {/* Adicionais - Box Destacado */}
              {item.customizations?.extrasNames && item.customizations.extrasNames.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    ➕ Adicionais: <span className="font-normal">{item.customizations.extrasNames.join(', ')}</span>
                  </p>
              {extrasTotalUnit > 0 && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  + R$ {extrasTotalUnit.toFixed(2)} {item.quantity > 1 && `x ${item.quantity}`} = R$ {extrasTotal.toFixed(2)}
                </p>
              )}
                </div>
              )}

              {/* Observações */}
              {item.customizations?.observations && (
                <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">💬 Observações:</span> {item.customizations.observations}
                  </p>
                </div>
              )}

              {/* Breakdown de Preços (footer discreto) */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal ({item.quantity}x R$ {basePrice.toFixed(2)})</span>
                  <span>R$ {itemSubtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
