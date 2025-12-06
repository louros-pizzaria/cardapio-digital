import { Badge } from "@/components/ui/badge";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";

interface StripeItemsListProps {
  items: any[];
  loading?: boolean;
}

export const StripeItemsList = ({ items, loading }: StripeItemsListProps) => {
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
          <div key={i} className="bg-muted h-32 rounded-lg" />
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

        return (
          <div
            key={index}
            className="bg-card border border-border rounded-2xl p-6"
          >
            {/* Nome do produto com quantidade e preço unitário */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                {item.quantity} x {item.products?.name || 'Produto'}
              </h3>
              <span className="text-xl font-bold text-foreground ml-4">
                {basePrice.toFixed(2)}
              </span>
            </div>

            {/* Borda recheada */}
            {item.customizations?.crustName && (
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Borda recheada: {item.customizations.crustName.replace(/^(borda recheada -?|borda -?)/i, '').trim()}
                </span>
                <span className="text-sm font-normal text-foreground">
                  + {crustPriceUnit.toFixed(2)} {item.quantity > 1 && `x ${item.quantity} = ${crustPrice.toFixed(2)}`}
                </span>
              </div>
            )}

            {/* Adicionais */}
            {item.customizations?.extrasNames && item.customizations.extrasNames.length > 0 && (
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Adicionais: {item.customizations.extrasNames.join(', ').toLowerCase()}
                </span>
                <span className="text-sm font-normal text-foreground">
                  + {extrasTotalUnit.toFixed(2)} {item.quantity > 1 && `x ${item.quantity} = ${extrasTotal.toFixed(2)}`}
                </span>
              </div>
            )}

            {/* Observações */}
            {item.customizations?.observations && (
              <>
                <div className="border-t border-border my-4" />
                <p className="text-base font-normal text-foreground">
                  obs: {item.customizations.observations}
                </p>
              </>
            )}

            {/* Total do item */}
            <div className="border-t border-border mt-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold text-foreground">
                  Total do item:
                </span>
                <span className="text-xl font-semibold text-foreground">
                  R$ {calculatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
