import { Card } from '@/components/ui/card';
import { Clock, CheckCircle, ChefHat, Package, Truck, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderTimelineProps {
  order: any;
}

export const OrderTimeline = ({ order }: OrderTimelineProps) => {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pedido Recebido',
      confirmed: 'Pedido Confirmado',
      preparing: 'Em Preparo',
      ready: 'Pronto',
      in_delivery: 'Saiu para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const timelineSteps = [
    {
      status: 'pending',
      label: 'Pedido Recebido',
      icon: CheckCircle,
      completed: true,
      timestamp: order.created_at,
    },
    {
      status: 'confirmed',
      label: 'Pedido Confirmado',
      icon: CheckCircle,
      completed: ['confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'].includes(order.status),
      timestamp: order.status !== 'pending' ? order.updated_at : null,
    },
    {
      status: 'preparing',
      label: 'Em Preparo',
      icon: ChefHat,
      completed: ['preparing', 'ready', 'in_delivery', 'delivered'].includes(order.status),
      timestamp: ['preparing', 'ready', 'in_delivery', 'delivered'].includes(order.status) ? order.updated_at : null,
    },
    {
      status: 'ready',
      label: order.delivery_method === 'pickup' ? 'Pronto para Retirada' : 'Pronto',
      icon: Package,
      completed: ['ready', 'in_delivery', 'delivered'].includes(order.status),
      timestamp: ['ready', 'in_delivery', 'delivered'].includes(order.status) ? order.updated_at : null,
    },
  ];

  // Adicionar etapa de entrega apenas para delivery
  if (order.delivery_method === 'delivery') {
    timelineSteps.push({
      status: 'in_delivery',
      label: 'Saiu para Entrega',
      icon: Truck,
      completed: ['in_delivery', 'delivered'].includes(order.status),
      timestamp: ['in_delivery', 'delivered'].includes(order.status) ? order.updated_at : null,
    });
  }

  // Adicionar etapa final
  timelineSteps.push({
    status: 'delivered',
    label: order.delivery_method === 'pickup' ? 'Retirado' : 'Entregue',
    icon: CheckCircle,
    completed: order.status === 'delivered',
    timestamp: order.status === 'delivered' ? order.updated_at : null,
  });

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold text-lg">Linha do Tempo</h3>
      </div>
      
      {order.status === 'cancelled' ? (
        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex-1 pb-2">
            <p className="font-medium">Pedido Cancelado</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            {order.cancellation_reason && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Motivo: {order.cancellation_reason}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === timelineSteps.length - 1;
            const isActive = order.status === step.status;
            
            return (
              <div key={step.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      step.completed
                        ? 'bg-green-100 dark:bg-green-950/30'
                        : isActive
                        ? 'bg-blue-100 dark:bg-blue-950/30 animate-pulse'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <Icon 
                      className={`h-5 w-5 ${
                        step.completed
                          ? 'text-green-600 dark:text-green-400'
                          : isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </div>
                  {!isLast && (
                    <div 
                      className={`w-0.5 h-12 mt-2 transition-colors ${
                        step.completed ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p 
                    className={`font-medium ${
                      step.completed || isActive ? '' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(step.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  {!step.completed && !isActive && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Aguardando...
                    </p>
                  )}
                  {isActive && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      ⏳ Em andamento
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
