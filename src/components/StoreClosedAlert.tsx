import { AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useStoreSchedule } from '@/hooks/useStoreSchedule';
import { useNavigate } from 'react-router-dom';

interface StoreClosedAlertProps {
  variant?: 'inline' | 'modal';
  onClose?: () => void;
  showBackButton?: boolean;
}

export const StoreClosedAlert = ({ 
  variant = 'inline', 
  onClose, 
  showBackButton = true 
}: StoreClosedAlertProps) => {
  const { nextOpening, scheduleData } = useStoreSchedule();
  const navigate = useNavigate();

  const handleBackToMenu = () => {
    if (onClose) onClose();
    navigate('/menu');
  };

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-lg font-semibold">Loja fechada no momento</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-muted-foreground">
          Não é possível fazer pedidos fora do horário de funcionamento.
        </p>
        
        {nextOpening && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Abriremos {nextOpening}</span>
          </div>
        )}

        {scheduleData?.additionalInfo && (
          <p className="text-sm text-muted-foreground border-l-2 border-destructive/30 pl-3 py-1">
            {scheduleData.additionalInfo}
          </p>
        )}

        {showBackButton && (
          <Button 
            onClick={handleBackToMenu}
            variant="outline" 
            className="w-full mt-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Cardápio
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
