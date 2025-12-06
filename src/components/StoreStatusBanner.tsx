import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStoreSchedule } from '@/hooks/useStoreSchedule';
import { cn } from '@/lib/utils';

export const StoreStatusBanner = () => {
  const { scheduleData, isOpen, nextOpening } = useStoreSchedule();

  if (!scheduleData || !scheduleData.autoSchedule) {
    return null;
  }

  return (
    <Alert className={cn(
      "mb-6",
      isOpen 
        ? "border-green-500 bg-green-50 dark:bg-green-950" 
        : "border-red-500 bg-red-50 dark:bg-red-950"
    )}>
      <div className="flex items-start gap-3">
        {isOpen ? (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
        )}
        <AlertDescription className="flex-1">
          <div className="flex flex-col gap-1">
            <span className={cn(
              "font-semibold text-base",
              isOpen 
                ? "text-green-700 dark:text-green-300" 
                : "text-red-700 dark:text-red-300"
            )}>
              {isOpen ? '🟢 Aberto agora!' : '🔴 Fechado no momento'}
            </span>
            {!isOpen && nextOpening && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Abriremos {nextOpening}
              </span>
            )}
            {scheduleData.additionalInfo && (
              <span className="text-sm text-muted-foreground mt-1">
                {scheduleData.additionalInfo}
              </span>
            )}
          </div>
        </AlertDescription>
        
        <details className="cursor-pointer">
          <summary className="text-xs text-muted-foreground hover:underline list-none">
            Ver horários
          </summary>
          <div className="mt-3 space-y-2 text-sm min-w-[200px]">
            {scheduleData.schedules
              .filter(s => s.isOpen)
              .map(schedule => (
                <div key={schedule.dayId} className="flex justify-between gap-4">
                  <span className="font-medium">{schedule.dayName}:</span>
                  <span className="text-muted-foreground">
                    {schedule.periods.map((p, i) => (
                      <span key={i}>
                        {p.start} - {p.end}
                        {i < schedule.periods.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
          </div>
        </details>
      </div>
    </Alert>
  );
};
