import { useState } from 'react';
import { CheckCircle, ChefHat, Package, Truck, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimelineEventsProps {
  order: any;
}

interface TimelineEvent {
  status: string;
  label: string;
  timestamp: string | null;
  icon: React.ComponentType<any>;
  isActive: boolean;
}

export const TimelineEvents = ({ order }: TimelineEventsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTimelineEvents = (): TimelineEvent[] => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);

    const allEvents: TimelineEvent[] = [
      {
        status: 'pending',
        label: 'Pedido recebido',
        timestamp: order.created_at,
        icon: CheckCircle,
        isActive: false,
      },
      {
        status: 'confirmed',
        label: 'Pedido confirmado',
        timestamp: currentIndex >= 1 ? order.updated_at : null,
        icon: CheckCircle,
        isActive: order.status === 'confirmed',
      },
      {
        status: 'preparing',
        label: 'Preparo iniciado',
        timestamp: currentIndex >= 2 ? order.updated_at : null,
        icon: ChefHat,
        isActive: order.status === 'preparing',
      },
    ];

    if (order.delivery_method === 'delivery') {
      allEvents.push({
        status: 'in_delivery',
        label: 'Saiu para entrega',
        timestamp: currentIndex >= 4 ? order.updated_at : null,
        icon: Truck,
        isActive: order.status === 'in_delivery',
      });
    } else {
      allEvents.push({
        status: 'ready',
        label: 'Pronto para retirada',
        timestamp: currentIndex >= 3 ? order.updated_at : null,
        icon: Package,
        isActive: order.status === 'ready',
      });
    }

    allEvents.push({
      status: 'delivered',
      label: order.delivery_method === 'pickup' ? 'Pedido retirado' : 'Pedido entregue',
      timestamp: order.status === 'delivered' ? order.updated_at : null,
      icon: CheckCircle,
      isActive: order.status === 'delivered',
    });

    return allEvents.filter(event => event.timestamp !== null);
  };

  const events = getTimelineEvents();
  const displayedEvents = isExpanded ? events : events.slice(-3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base text-foreground">Histórico Detalhado</h3>
        {events.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Ver tudo ({events.length})
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-3 relative">
        {displayedEvents.map((event, index) => {
          const Icon = event.icon;
          const isLast = index === displayedEvents.length - 1;

          return (
            <div key={event.status} className="flex gap-3 relative">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />
              )}

              {/* Icon */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                  event.isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <p className={cn(
                  "text-sm font-medium",
                  event.isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {event.label}
                </p>
                {event.timestamp && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {format(new Date(event.timestamp), "HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
