import { CreditCard, Banknote, QrCode, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PaymentInfoProps {
  order: any;
}

export const PaymentInfo = ({ order }: PaymentInfoProps) => {
  const getPaymentMethodInfo = () => {
    switch (order.payment_method) {
      case 'pix':
        return { icon: QrCode, label: 'PIX' };
      case 'credit_card':
        return { icon: CreditCard, label: 'Cartão de Crédito' };
      case 'debit_card':
        return { icon: CreditCard, label: 'Cartão de Débito' };
      case 'cash':
        return { icon: Banknote, label: 'Dinheiro' };
      default:
        return { icon: CreditCard, label: 'Pagamento' };
    }
  };

  const getPaymentStatusInfo = () => {
    switch (order.payment_status) {
      case 'paid':
        return { 
          label: 'Pago', 
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-600 dark:text-green-400'
        };
      case 'pending':
        return { 
          label: 'Pendente', 
          variant: 'secondary' as const,
          icon: Clock,
          color: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'processing':
        return { 
          label: 'Processando', 
          variant: 'secondary' as const,
          icon: Clock,
          color: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return { 
          label: 'Aguardando', 
          variant: 'secondary' as const,
          icon: Clock,
          color: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const methodInfo = getPaymentMethodInfo();
  const statusInfo = getPaymentStatusInfo();
  const PaymentIcon = methodInfo.icon;
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        {/* Header com título e badge de status */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-foreground">Pagamento</h3>
          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
            <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
            <span className={statusInfo.color}>{statusInfo.label}</span>
          </Badge>
        </div>
        
        {/* Forma de pagamento */}
        <div className="flex items-center gap-2 text-sm">
          <PaymentIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Forma de pagamento:</span>
          <span className="font-medium text-foreground">{methodInfo.label}</span>
        </div>

        {/* Mensagens condicionais */}
        {order.payment_method === 'pix' && order.payment_status === 'pending' && (
          <p className="text-xs text-muted-foreground pt-1">
            Aguardando confirmação do pagamento via PIX
          </p>
        )}

        {order.payment_method === 'cash' && order.notes && (
          <p className="text-xs text-muted-foreground pt-1">
            <span className="font-medium">Troco para:</span> {order.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
