import { Card, CardContent } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

interface FinancialSummaryProps {
  order: any;
}

export const FinancialSummary = ({ order }: FinancialSummaryProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const subtotal = order.total_amount - (order.delivery_fee || 0) + (order.discount_amount || 0);

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base text-foreground">Resumo Financeiro</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
          </div>

          {order.delivery_fee > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa de entrega</span>
              <span className="text-foreground font-medium">{formatPrice(order.delivery_fee)}</span>
            </div>
          ) : order.delivery_method === 'delivery' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa de entrega</span>
              <span className="text-green-600 dark:text-green-400 font-medium">Grátis</span>
            </div>
          )}

          {order.discount_amount > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">Desconto</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  - {formatPrice(order.discount_amount)}
                </span>
              </div>
              {order.coupon_code && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cupom aplicado</span>
                  <span className="text-muted-foreground font-mono">{order.coupon_code}</span>
                </div>
              )}
            </>
          )}

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
