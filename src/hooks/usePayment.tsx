
import { create } from 'zustand';
import { useToast } from '@/hooks/use-toast';

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error' | 'cancelled';

interface PaymentStore {
  status: PaymentStatus;
  isLoading: boolean;
  error: string | null;
  setStatus: (status: PaymentStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePayment = create<PaymentStore>((set) => ({
  status: 'idle',
  isLoading: false,
  error: null,
  setStatus: (status) => set({ status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ 
    status: 'idle', 
    isLoading: false, 
    error: null 
  }),
}));

// Hook personalizado que integra com toast
export const usePaymentFlow = () => {
  const payment = usePayment();
  const { toast } = useToast();

  const handlePaymentStart = () => {
    payment.setStatus('processing');
    payment.setLoading(true);
    payment.setError(null);
  };

  const handlePaymentSuccess = () => {
    payment.setStatus('success');
    payment.setLoading(false);
    toast({
      title: "Pagamento aprovado!",
      description: "Sua assinatura foi ativada com sucesso.",
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    payment.setStatus('error');
    payment.setLoading(false);
    payment.setError(errorMessage);
    toast({
      title: "Erro no pagamento",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const handlePaymentCancel = () => {
    payment.setStatus('cancelled');
    payment.setLoading(false);
    toast({
      title: "Pagamento cancelado",
      description: "O processo de pagamento foi cancelado.",
      variant: "destructive",
    });
  };

  return {
    ...payment,
    handlePaymentStart,
    handlePaymentSuccess,
    handlePaymentError,
    handlePaymentCancel,
  };
};
