import { CheckCircle, ChefHat, Package, Truck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStatus: string;
  deliveryMethod: 'delivery' | 'pickup';
}

interface Step {
  status: string;
  label: string;
  icon: React.ComponentType<any>;
}

export const ProgressBar = ({ currentStatus, deliveryMethod }: ProgressBarProps) => {
  const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const stepsPickup: Step[] = [
    { status: 'confirmed', label: 'Pedido recebido', icon: CheckCircle },
    { status: 'preparing', label: 'Em Preparo', icon: ChefHat },
    { status: 'ready', label: 'Pronto para Retirada', icon: Package },
    { status: 'delivered', label: 'Pedido Concluído', icon: Check },
  ];

  const stepsDelivery: Step[] = [
    { status: 'confirmed', label: 'Pedido recebido', icon: CheckCircle },
    { status: 'preparing', label: 'Em Preparo', icon: ChefHat },
    { status: 'in_delivery', label: 'Saiu para entrega', icon: Truck },
    { status: 'delivered', label: 'Pedido Concluído', icon: Check },
  ];

  const steps = deliveryMethod === 'pickup' ? stepsPickup : stepsDelivery;

  const isStepCompleted = (stepStatus: string): boolean => {
    const stepIndex = statusOrder.indexOf(stepStatus);
    return currentIndex >= stepIndex;
  };

  const isStepActive = (stepStatus: string): boolean => {
    return currentStatus === stepStatus;
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-10" />
        <div 
          className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500 -z-10"
          style={{ 
            width: `${(currentIndex / (steps.length - 1)) * 100}%` 
          }}
        />

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = isStepCompleted(step.status);
          const isActive = isStepActive(step.status);

          return (
            <div key={step.status} className="flex flex-col items-center flex-1 relative">
              {/* Circle with icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 bg-background",
                  isCompleted 
                    ? "border-primary bg-primary text-primary-foreground shadow-md" 
                    : "border-muted bg-muted text-muted-foreground",
                  isActive && "animate-pulse shadow-lg scale-110"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              
              {/* Label */}
              <p 
                className={cn(
                  "text-xs mt-2 text-center font-medium transition-colors",
                  isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
