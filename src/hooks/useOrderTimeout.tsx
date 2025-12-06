import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cacheManager } from '@/utils/cacheManager';

interface UseOrderTimeoutProps {
  orderId?: string;
  timeoutMinutes?: number;
  onTimeout?: () => void;
}

export const useOrderTimeout = ({ 
  orderId, 
  timeoutMinutes = 30, 
  onTimeout 
}: UseOrderTimeoutProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!orderId) return;

    // Calcular tempo restante baseado no cache ou criar novo timeout
    const cacheKey = `order_timeout:${orderId}`;
    let startTime = cacheManager.get<number>(cacheKey);
    
    if (!startTime) {
      startTime = Date.now();
      cacheManager.set(cacheKey, startTime, timeoutMinutes * 60 * 1000, 'high');
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, timeoutMs - elapsed);

    if (remaining === 0) {
      setIsExpired(true);
      onTimeout?.();
      return;
    }

    setTimeRemaining(remaining);

    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsed = now - startTime;
      const newRemaining = Math.max(0, timeoutMs - newElapsed);

      setTimeRemaining(newRemaining);

      if (newRemaining === 0) {
        setIsExpired(true);
        clearInterval(interval);
        
        // Limpar cache do pedido
        cacheManager.cleanupOrderCache();
        
        // Notificar usuário
        toast({
          title: "Pedido Expirado",
          description: "Seu pedido expirou. Por favor, refaça seu pedido.",
          variant: "destructive"
        });

        onTimeout?.();
      }

      // Aviso aos 5 minutos restantes
      if (newRemaining <= 5 * 60 * 1000 && newRemaining > 4 * 60 * 1000) {
        toast({
          title: "Pedido Expirando",
          description: "Seu pedido expira em 5 minutos. Complete o pagamento!",
          variant: "destructive"
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderId, timeoutMinutes, onTimeout, toast]);

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    isExpired,
    formattedTime: timeRemaining ? formatTimeRemaining(timeRemaining) : null,
    minutesRemaining: timeRemaining ? Math.floor(timeRemaining / 60000) : null
  };
};