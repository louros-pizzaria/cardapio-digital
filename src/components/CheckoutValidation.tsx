import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User } from 'lucide-react';
import { useProfile } from '@/hooks/useUnifiedProfile';

interface CheckoutValidationProps {
  deliveryMethod: 'delivery' | 'pickup';
  onNavigateToProfile: () => void;
  onBlockCheckout?: (blocked: boolean) => void;
}

export const CheckoutValidation = ({ deliveryMethod, onNavigateToProfile, onBlockCheckout }: CheckoutValidationProps) => {
  const { profile, isProfileComplete } = useProfile();

  // Verificar se dados obrigatórios estão presentes
  const missingData: string[] = [];

  if (!profile?.full_name) {
    missingData.push('Nome completo');
  }

  if (deliveryMethod === 'delivery' && !profile?.phone) {
    missingData.push('Telefone');
  }

  // Notificar componente pai sobre bloqueio
  React.useEffect(() => {
    onBlockCheckout?.(missingData.length > 0);
  }, [missingData.length, onBlockCheckout]);

  if (missingData.length === 0) {
    return null; // Tudo ok, não mostrar nada
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="space-y-2">
          <p className="font-medium">
            Para continuar com o pedido, complete os dados obrigatórios:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {missingData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToProfile}
            className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <User className="h-4 w-4 mr-2" />
            Completar Perfil
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};