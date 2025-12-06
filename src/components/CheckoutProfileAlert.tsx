import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useUnifiedProfile';

interface CheckoutProfileAlertProps {
  deliveryMethod: 'delivery' | 'pickup';
}

export const CheckoutProfileAlert = ({ deliveryMethod }: CheckoutProfileAlertProps) => {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();

  if (loading) return null;

  const missingFields: string[] = [];
  
  if (!profile?.full_name) {
    missingFields.push('Nome completo');
  }
  
  if (deliveryMethod === 'delivery' && !profile?.phone) {
    missingFields.push('Telefone');
  }

  if (missingFields.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Complete seu perfil para continuar</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>Os seguintes dados são obrigatórios:</p>
        <ul className="list-disc list-inside">
          {missingFields.map(field => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/account')}
          className="mt-2"
        >
          Ir para Minha Conta
        </Button>
      </AlertDescription>
    </Alert>
  );
};