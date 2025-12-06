import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';

// ===== COMPONENTE PIX OTIMIZADO PARA PERFORMANCE =====

interface PixPaymentProps {
  orderData: any; // Order data for creating new order with PIX
  onPaymentSuccess: () => void;
}

interface PixData {
  transactionId: string;
  brCode: string;
  qrCodeUrl: string;
  amount: string;
  expiresAt: string;
}

export const PixPayment = ({ orderData, onPaymentSuccess }: PixPaymentProps) => {
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'success' | 'expired' | 'error'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();
  
  // Refs para controle de intervalos e evitar memory leaks
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Polling inteligente - aumenta intervalo progressivamente
  const [pollingInterval, setPollingInterval] = useState(5000); // Começa com 5s
  const maxPollingInterval = 30000; // Máximo 30s

  useEffect(() => {
    createOrderAndPixPayment();
    
    return () => {
      isUnmountedRef.current = true;
      clearAllIntervals();
    };
  }, [orderData]);

  // Função para limpar todos os intervalos
  const clearAllIntervals = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Polling otimizado com backoff exponencial
  useEffect(() => {
    if (pixData && paymentStatus === 'pending') {
      console.log('[PIX-OPTIMIZED] Starting intelligent polling with interval:', pollingInterval);
      
      pollingIntervalRef.current = setInterval(() => {
        if (isUnmountedRef.current) return;
        
        checkPaymentStatus();
        
        // Aumentar intervalo progressivamente para reduzir carga
        setPollingInterval(prev => Math.min(prev + 2000, maxPollingInterval));
      }, pollingInterval);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [pixData, paymentStatus, pollingInterval]);

  // Timer otimizado
  useEffect(() => {
    if (pixData && paymentStatus !== 'success' && paymentStatus !== 'expired') {
      const expiresAt = new Date(pixData.expiresAt).getTime();
      
      const updateTimer = () => {
        if (isUnmountedRef.current) return;
        
        const now = Date.now();
        const remaining = Math.max(0, expiresAt - now);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          console.log('[PIX-OPTIMIZED] PIX expired');
          setPaymentStatus('expired');
          clearAllIntervals();
        }
      };
      
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [pixData, paymentStatus]);

  const createOrderAndPixPayment = async () => {
    // Reset state
    setPixData(null);
    setPaymentStatus('pending');
    setPollingInterval(5000); // Reset intervalo
    clearAllIntervals();
    
    try {
      setLoading(true);
      
      // FASE 3: Verificar se já tem orderId (vindo da query string/orderData)
      if (orderData?.orderId) {
        console.log('[PIX-UNIFIED] Processing PIX for existing order:', orderData.orderId);
        
        // Apenas gerar PIX para o pedido existente
        const { data, error } = await supabase.functions.invoke('create-order-with-pix', {
          body: {
            orderId: orderData.orderId
          }
        });
        
        if (isUnmountedRef.current) return;
        
        if (error) {
          console.error('[PIX-UNIFIED] Error generating PIX:', error);
          throw error;
        }
        
        console.log('[PIX-UNIFIED] PIX generated for order:', data.orderId);
        setPixData(data.pixData);
        setPaymentStatus('pending');
        setLoading(false);
        
        toast({
          title: "PIX gerado com sucesso!",
          description: "Escaneie o QR Code ou copie o código PIX para pagar.",
        });
        return;
      }
      
      // LEGADO: Suporte para fluxo antigo (criar pedido + PIX)
      console.log('[PIX-UNIFIED] Creating order with PIX (legacy flow):', orderData);
      
      const { data, error } = await supabase.functions.invoke('create-order-with-pix', {
        body: orderData
      });

      if (isUnmountedRef.current) return;

      if (error) {
        console.error('[PIX-UNIFIED] Supabase function error:', error);
        throw new Error(error.message || 'Erro na comunicação com o servidor');
      }

      if (!data?.order || !data?.pixData?.brCode) {
        console.error('[PIX-UNIFIED] Invalid response data:', data);
        throw new Error('Pedido ou código PIX não foi gerado corretamente');
      }

      console.log('[PIX-UNIFIED] Order and PIX created successfully');
      setPixData(data.pixData);
      setPaymentStatus('pending');
      
      // Clear pending order from localStorage
      localStorage.removeItem('pendingOrder');
      
      toast({
        title: "Pedido criado com sucesso!",
        description: "Escaneie o QR Code ou copie o código PIX para pagar.",
      });
    } catch (error: any) {
      if (isUnmountedRef.current) return;
      
      console.error('[PIX-UNIFIED] Error creating order and PIX:', error);
      setPaymentStatus('error');
      
      toast({
        title: "Erro ao criar pedido",
        description: error.message || 'Erro inesperado. Tente novamente.',
        variant: "destructive",
      });
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  };

  const checkPaymentStatus = async () => {
    if (!pixData || paymentStatus !== 'pending' || isUnmountedRef.current) return;

    try {
      setPaymentStatus('checking');
      console.log('[PIX-OPTIMIZED] Checking payment status (interval:', pollingInterval, 'ms)');
      
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: { transactionId: pixData.transactionId }
      });

      if (isUnmountedRef.current) return;

      if (error) {
        console.error('[PIX-OPTIMIZED] Error checking payment:', error);
        setPaymentStatus('pending');
        return;
      }

      if (data.status === 'paid') {
        console.log('[PIX-OPTIMIZED] Payment confirmed!');
        setPaymentStatus('success');
        clearAllIntervals();
        
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi aprovado com sucesso.",
        });
        
        onPaymentSuccess();
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
        clearAllIntervals();
      } else {
        setPaymentStatus('pending');
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        console.error('[PIX-OPTIMIZED] Error checking payment:', error);
        setPaymentStatus('pending');
      }
    }
  };

  const copyToClipboard = async () => {
    if (!pixData) return;
    
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no seu banco para efetuar o pagamento.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Aguardando pagamento
        </Badge>;
      case 'checking':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Verificando...
        </Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Pagamento aprovado
        </Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Expirado
        </Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Erro
        </Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-pizza-red" />
            <div className="text-center">
              <span className="text-lg font-medium">Gerando PIX...</span>
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde alguns segundos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pixData || paymentStatus === 'error') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao gerar PIX</h3>
          <p className="text-muted-foreground mb-4">
            Não foi possível gerar o código PIX. Tente novamente.
          </p>
            <Button onClick={createOrderAndPixPayment}>
              Tentar novamente
            </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Pagamento PIX</CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Valor: {pixData.amount}</span>
          {timeLeft > 0 && paymentStatus === 'pending' && (
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Expira em: {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {paymentStatus !== 'success' && paymentStatus !== 'expired' && (
          <>
            {/* QR Code otimizado */}
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block border">
                <img 
                  src={pixData.qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                  loading="lazy"
                  onError={(e) => {
                    console.error('[PIX-OPTIMIZED] QR Code failed to load');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Escaneie o QR Code com o app do seu banco
              </p>
            </div>

            <Separator />

            {/* Código PIX Copia e Cola */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Ou copie o código PIX:
              </label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                  {pixData.brCode}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Após o pagamento, a confirmação pode levar alguns segundos.
                <br />
                <span className="text-xs">
                  (Verificando a cada {Math.round(pollingInterval/1000)}s)
                </span>
              </p>
            </div>
          </>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 mb-2">
              Pagamento confirmado!
            </h3>
            <p className="text-muted-foreground">
              Seu pedido foi aprovado e será preparado em breve.
            </p>
          </div>
        )}

        {paymentStatus === 'expired' && (
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 mb-2">
              PIX Expirado
            </h3>
            <p className="text-muted-foreground mb-4">
              O código PIX expirou. Gere um novo código para continuar.
            </p>
            <Button onClick={createOrderAndPixPayment}>
              Gerar novo PIX
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};