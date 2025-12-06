interface StripeFinancialSummaryProps {
  order: any;
}

export const StripeFinancialSummary = ({ order }: StripeFinancialSummaryProps) => {
  const subtotal = order.total_amount - (order.delivery_fee || 0) + (order.discount_amount || 0);
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Resumo Financeiro</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">R$ {subtotal.toFixed(2)}</span>
        </div>
        
        {order.delivery_fee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Taxa de entrega</span>
            <span className="text-gray-900">R$ {order.delivery_fee.toFixed(2)}</span>
          </div>
        )}
        
        {order.discount_amount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600">Desconto</span>
            <span className="text-green-600">- R$ {order.discount_amount.toFixed(2)}</span>
          </div>
        )}
        
        {order.coupon_code && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Cupom aplicado</span>
            <span className="text-gray-500 font-mono">{order.coupon_code}</span>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              R$ {order.total_amount?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
