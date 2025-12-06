import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";

interface StripeInfoCardsProps {
  order: any;
  items?: any[];
}

export const StripeInfoCards = ({ order, items = [] }: StripeInfoCardsProps) => {
  const { crustById, crustByName, extraByName } = useCatalogPricing();
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      cash: 'Dinheiro',
      credit_card_delivery: 'Cartão de Crédito (Presencial)',
      debit_card_delivery: 'Cartão de Débito (Presencial)',
    };
    return labels[method] || method;
  };

  const getPaymentStatusBadge = () => {
    if (order.payment_status === 'paid') {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
          ✓ Pago
        </Badge>
      );
    }
    
    const isPresencial = ['credit_card_delivery', 'debit_card_delivery', 'cash'].includes(order.payment_method);
    
    return (
      <Badge variant="secondary" className="text-xs">
        {isPresencial ? '💰 A Cobrar' : '⏳ Pendente'}
      </Badge>
    );
  };

  // Calcular subtotal baseado nos itens reais
  const calculateItemsSubtotal = () => {
    if (!items || items.length === 0) {
      // Fallback para o cálculo antigo
      return order.total_amount - (order.delivery_fee || 0) + (order.discount_amount || 0);
    }

    let total = 0;
    
    items.forEach((item: any) => {
      // Preço base do produto
      const basePrice = item.unit_price * item.quantity;
      
      // Calcular preço da borda
      let crustPrice = 0;
      if (item.customizations?.crust) {
        const crust = crustById[item.customizations.crust];
        crustPrice = (crust?.price || 0) * item.quantity;
      } else if (item.customizations?.crustName) {
        const crust = crustByName[item.customizations.crustName];
        crustPrice = (crust?.price || 0) * item.quantity;
      }
      
      // Calcular preço dos extras
      let extrasPrice = 0;
      if (item.customizations?.extrasNames && Array.isArray(item.customizations.extrasNames)) {
        item.customizations.extrasNames.forEach((extraName: string) => {
          const extra = extraByName[extraName];
          extrasPrice += (extra?.price || 0) * item.quantity;
        });
      }
      
      total += basePrice + crustPrice + extrasPrice;
    });
    
    return total;
  };

  const subtotal = calculateItemsSubtotal();
  const deliveryFee = order.delivery_fee || 0;
  const discountAmount = order.discount_amount || 0;
  const totalAmount = subtotal + deliveryFee - discountAmount;

  return (
    <div className="font-mono text-sm space-y-0">
      {/* CLIENTE */}
      <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-4">
        <h3 className="font-bold text-gray-900 text-center text-base mb-3">CLIENTE</h3>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-600">Nome:</span>
            <span className="text-gray-900 font-medium">{order.customer_name || 'Não informado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Telefone:</span>
            <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
              {order.customer_phone || 'Não informado'}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">E-mail:</span>
            <span className="text-gray-900 truncate max-w-[180px]">{order.customer_email || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CPF:</span>
            <span className="text-gray-900">{order.customer_cpf || '—'}</span>
          </div>
        </div>
      </div>

      {/* ENTREGA / RETIRADA */}
      <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-4">
        <h3 className="font-bold text-gray-900 text-center text-base mb-3">
          {order.delivery_method === 'delivery' ? 'ENTREGA' : 'RETIRADA'}
        </h3>
        
        {order.delivery_method === 'delivery' ? (
          <div className="space-y-1.5">
            {order.delivery_address_snapshot ? (
              <>
                <div>
                  <p className="text-gray-900 font-medium">
                    {order.delivery_address_snapshot.street}, {order.delivery_address_snapshot.number}
                  </p>
                  {order.delivery_address_snapshot.complement && (
                    <p className="text-gray-600 text-xs">{order.delivery_address_snapshot.complement}</p>
                  )}
                  <p className="text-gray-600 text-xs">
                    {order.delivery_address_snapshot.neighborhood} - {order.delivery_address_snapshot.city}/{order.delivery_address_snapshot.state}
                  </p>
                  {order.delivery_address_snapshot.zip_code && (
                    <p className="text-gray-600 text-xs">CEP: {order.delivery_address_snapshot.zip_code}</p>
                  )}
                </div>
                {order.delivery_address_snapshot.reference_point && (
                  <div className="pt-2 border-t border-dashed border-gray-300">
                    <p className="text-gray-600 text-xs">Ref: {order.delivery_address_snapshot.reference_point}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-center">Endereço não informado</p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-900 font-medium">Cliente vai retirar no balcão</p>
            {order.estimated_delivery_time && (
              <p className="text-gray-600 text-xs mt-1">Tempo estimado: {order.estimated_delivery_time} min</p>
            )}
          </div>
        )}
      </div>

      {/* PEDIDO */}
      <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-4">
        <h3 className="font-bold text-gray-900 text-center text-base mb-3">PEDIDO</h3>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-600">Valor do pedido:</span>
            <span className="text-gray-900 font-medium">R$ {subtotal.toFixed(2)}</span>
          </div>
          
          {order.delivery_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Taxa de entrega:</span>
              <span className="text-gray-900 font-medium">R$ {order.delivery_fee.toFixed(2)}</span>
            </div>
          )}
          
          {order.discount_amount > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-green-600">Descontos:</span>
                <span className="text-green-600 font-medium">-R$ {order.discount_amount.toFixed(2)}</span>
              </div>
              {order.coupon_code && (
                <div className="text-xs text-gray-500 text-right">Cupom: {order.coupon_code}</div>
              )}
            </>
          )}
          
          <div className="pt-2 mt-2 border-t-2 border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-bold text-base">Total:</span>
              <span className="text-gray-900 font-bold text-lg">R$ {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAGAMENTO */}
      <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-4">
        <h3 className="font-bold text-gray-900 text-center text-base mb-3">PAGAMENTO</h3>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Forma:</span>
            <span className="text-gray-900 font-medium">{getPaymentMethodLabel(order.payment_method)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status:</span>
            <div>{getPaymentStatusBadge()}</div>
          </div>
          
          {order.payment_method === 'cash' && order.change_amount && (
            <div className="flex justify-between pt-2 border-t border-dashed border-gray-300">
              <span className="text-gray-600">Troco para:</span>
              <span className="text-gray-900 font-bold">R$ {order.change_amount.toFixed(2)}</span>
            </div>
          )}
          
          {order.external_payment_id && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs"
                onClick={() => window.open(`https://dashboard.stripe.com/payments/${order.external_payment_id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Ver transação
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      {order.notes && (
        <div className="border-t-2 border-b-2 border-gray-800 py-3">
          <h3 className="font-bold text-gray-900 text-center text-base mb-2">OBSERVAÇÕES</h3>
          <p className="text-gray-900 text-center px-2">{order.notes}</p>
        </div>
      )}
    </div>
  );
};
