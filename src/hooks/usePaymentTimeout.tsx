import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useToast } from '@/hooks/use-toast';

interface UsePaymentTimeoutProps {
  orderId: string;
  timeoutMinutes?: number;
  onTimeout?: () => void;
}

export const usePaymentTimeout = ({
  orderId,
  timeoutMinutes = 30,
  onTimeout
}: UsePaymentTimeoutProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeoutMinutes * 60 * 1000);
  const [isExpired, setIsExpired] = useState(false);
  const { toast } = useToast();

  const handleTimeout = useCallback(async () => {
    if (isExpired) return;

    setIsExpired(true);
    
    try {
      // Cancel the order
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'timeout',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error cancelling order:', error);
      }

      toast({
        title: "Pagamento expirado",
        description: "O tempo limite para pagamento foi atingido. O pedido foi cancelado.",
        variant: "destructive",
      });

      onTimeout?.();
    } catch (error) {
      console.error('Error handling timeout:', error);
    }
  }, [orderId, isExpired, onTimeout, toast]);

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1000);
        
        if (newTime === 0) {
          handleTimeout();
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, handleTimeout]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setTimeLeft(timeoutMinutes * 60 * 1000);
    setIsExpired(false);
  };

  return {
    timeLeft,
    isExpired,
    formattedTime: formatTime(timeLeft),
    resetTimer
  };
};