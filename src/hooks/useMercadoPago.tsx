import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';

export type PaymentMethod = 'pix' | 'credit_card' | 'cash' | 'any';

interface MercadoPagoResponse {
  preference_id: string;
  init_point: string;
}

export const useMercadoPago = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createPayment = async (orderId: string, paymentMethod: PaymentMethod = 'any') => {
    setIsLoading(true);
    
    try {
      console.log('[MERCADOPAGO] Creating payment preference', { orderId, paymentMethod });

      const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        body: { 
          orderId,
          paymentMethod 
        }
      });

      if (error) {
        console.error('[MERCADOPAGO] Error creating preference:', error);
        throw new Error(error.message);
      }

      const response = data as MercadoPagoResponse;
      console.log('[MERCADOPAGO] Preference created successfully', response);

      // Redirect to MercadoPago checkout
      if (response.init_point) {
        window.open(response.init_point, '_blank');
      } else {
        throw new Error('No init_point received from MercadoPago');
      }

      return response;

    } catch (error) {
      console.error('[MERCADOPAGO] Payment creation failed:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createPixPayment = (orderId: string) => {
    return createPayment(orderId, 'pix');
  };

  const createCardPayment = (orderId: string) => {
    return createPayment(orderId, 'credit_card');
  };

  return {
    createPayment,
    createPixPayment,
    createCardPayment,
    isLoading
  };
};