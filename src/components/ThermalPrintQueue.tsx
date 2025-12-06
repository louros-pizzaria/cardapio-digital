// ===== COMPONENTE DE FILA DE IMPRESSÃO =====

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, RefreshCw, X, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { PrintQueueItem } from "@/types/thermalPrint";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ThermalPrintQueueProps {
  queue: PrintQueueItem[];
  onRetry: (queueId: string) => void;
  onClear: () => void;
}

export const ThermalPrintQueue = ({ queue, onRetry, onClear }: ThermalPrintQueueProps) => {
  const getStatusColor = (status: PrintQueueItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'printing': return 'bg-primary text-primary-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: PrintQueueItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'printing': return <Printer className="h-4 w-4 animate-pulse" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: PrintQueueItem['status']) => {
    switch (status) {
      case 'completed': return 'Impresso';
      case 'printing': return 'Imprimindo';
      case 'failed': return 'Falhou';
      default: return 'Aguardando';
    }
  };

  if (queue.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Printer className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma impressão na fila</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          <h3 className="font-semibold">Fila de Impressão</h3>
          <Badge variant="secondary">{queue.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={queue.every(item => item.status === 'printing')}
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {queue.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1">{getStatusText(item.status)}</span>
                    </Badge>
                    <span className="text-sm font-mono">
                      #{item.orderId.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(item.timestamp, { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </div>

                  {item.error && (
                    <div className="text-xs text-destructive mt-1">
                      <p className="font-medium">{item.error.message}</p>
                      <p className="text-muted-foreground">{item.error.suggestedAction}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Tentativa {item.attempts} de {item.maxAttempts}
                  </div>
                </div>

                {item.status === 'failed' && item.error?.retryable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(item.id)}
                    disabled={item.attempts >= item.maxAttempts}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tentar novamente
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
