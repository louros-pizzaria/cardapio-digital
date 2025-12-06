import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAttendant } from '@/providers/AttendantProvider';

export const AttendantConnectionStatus = () => {
  const { isConnected } = useAttendant();

  // Mostrar mensagem se desconectado
  if (!isConnected) {
    return (
      <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-100">
          Reconectando...
        </AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          Tentando restabelecer conexão em tempo real
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
