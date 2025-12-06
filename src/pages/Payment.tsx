import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, QrCode, Copy, CheckCircle, XCircle, ArrowLeft, CreditCard, Truck, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';
import { SecureStorage } from '@/utils/secureStorage';
import { formatCurrency } from '@/utils/formatting';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { IntegratedCardPayment } from '@/components/IntegratedCardPayment';
import { useUnifiedStore } from '@/stores/simpleStore';

interface Order {
  id: string;
  total_amount: number;
  delivery_fee: number;
  payment_method: string;
  status: string;
  payment_status: string;
}

interface PixData {
  transactionId: string;
  brCode: string;
  qrCodeUrl: string;
  qrCodeBase64: string | null;
  amount: string;
  expiresAt: string;
  mercadoPagoId: number;
  ticketUrl?: string;
}

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const { clearCart } = useUnifiedStore();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'form' | 'pending' | 'checking' | 'success' | 'expired' | 'error'>('form');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Detectar tipo de pagamento pela rota: /payment/pix ou /payment/card
  const paymentType = location.pathname.includes('/pix') ? 'pix' : 
                      location.pathname.includes('/card') ? 'card' :
                      searchParams.get('type') || 'pix'; // Fallback para query param
  const orderId = searchParams.get('order');

  useEffect(() => {
    initializePayment();
  }, [paymentType, orderId]);

  const initializePayment = async () => {
    setLoading(true);
    
    try {
      console.log('[PAYMENT] Initializing payment...', { paymentType, orderId });
      
      // FASE 2: Se tem orderId na URL, usar ele diretamente (novo fluxo)
      if (orderId) {
        console.log('[PAYMENT] Using orderId from URL:', orderId);
        setOrderData({ orderId }); // Passar orderId para os componentes
        
        if (paymentType === 'card') {
          console.log('[PAYMENT] Setting up card payment form with orderId');
          setPaymentStatus('form');
        } else if (paymentType === 'pix') {
          console.log('[PAYMENT] Creating PIX payment for existing order');
          await createOrderAndPixPayment({ orderId });
        }
        return;
      }
      
      // Verificar se há dados do pedido com SecureStorage (fluxo legado)
      const stateOrderData = location.state?.orderData;
      const pendingOrderData = await SecureStorage.get('pendingOrder');
      
      console.log('[PAYMENT] Data sources:', {
        hasStateData: !!stateOrderData,
        hasPendingData: !!pendingOrderData,
        hasOrderId: !!orderId
      });
      
      // Determinar qual dado usar
      const dataToUse = stateOrderData || pendingOrderData;
      
      // Verificar se tem dados
      if (!dataToUse && !orderId) {
        console.error('[PAYMENT] No order data available');
        toast({
          title: "Sessão expirada",
          description: "Refaça seu pedido",
          variant: "destructive"
        });
        navigate('/menu');
        return;
      }
      
      // Setar orderData no state
      if (dataToUse) {
        setOrderData(dataToUse);
        console.log('[PAYMENT] Order data loaded:', {
          items: dataToUse.items?.length,
          total: dataToUse.total
        });
      }

      // Processar pagamento de acordo com o tipo
      if (paymentType === 'card') {
        console.log('[PAYMENT] Setting up card payment form');
        setPaymentStatus('form');
      } else if (paymentType === 'pix') {
        console.log('[PAYMENT] Creating PIX payment');
        
        if (!dataToUse) {
          throw new Error('Dados do pedido não disponíveis para PIX');
        }
        
        await createOrderAndPixPayment(dataToUse);
      }
    } catch (error: any) {
      console.error('[PAYMENT] Error initializing payment:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao inicializar pagamento",
        variant: "destructive"
      });
      navigate('/menu');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingOrder = async (orderId: string) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      throw error;
    }
  };

  const createOrderAndPixPayment = async (orderData: any) => {
    try {
      console.log('[PAYMENT] Creating PIX order...', {
        itemsCount: orderData.items?.length,
        total: orderData.total,
        deliveryMethod: orderData.delivery_method
      });
      
      setPaymentStatus('pending');
      
      const { data, error } = await supabase.functions.invoke('create-order-with-pix', {
        body: orderData
      });

      if (error) {
        console.error('[PAYMENT] Edge function error:', error);
        throw error;
      }

      // Aceitar ambos os formatos: { order: {...}, pixData } ou { orderId: "...", pixData }
      if (!data || !data.pixData) {
        console.error('[PAYMENT] Invalid response from edge function:', data);
        throw new Error('Resposta inválida do servidor');
      }

      // Determinar orderId do formato correto
      const receivedOrderId = data.order?.id || data.orderId;
      
      console.log('[PAYMENT] PIX order created successfully:', {
        orderId: receivedOrderId,
        pixCode: data.pixData.pixCode?.substring(0, 20) + '...',
        transactionId: data.pixData.transactionId
      });

      // Se recebeu objeto order, usar diretamente; senão buscar pelo orderId
      if (data.order) {
        setOrder(data.order);
      } else if (data.orderId) {
        await fetchExistingOrder(data.orderId);
      }
      
      setPixData(data.pixData);
      await SecureStorage.remove('pendingOrder');
      
      // Limpar carrinho imediatamente
      clearCart();
      
      // Iniciar contagem regressiva do PIX (5 minutos = 300 segundos)
      const expiresAt = new Date(data.pixData.expiresAt);
      const now = new Date();
      const timeLeftMs = expiresAt.getTime() - now.getTime();
      const secondsLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
      setTimeLeft(secondsLeft);
      
      console.log('[PAYMENT] PIX timer initialized:', {
        expiresAt: expiresAt.toISOString(),
        timeLeftSeconds: secondsLeft,
        timeLeftMinutes: Math.floor(secondsLeft / 60)
      });
      
      // Iniciar verificação de status
      startPaymentStatusCheck(data.pixData.transactionId);
    } catch (error: any) {
      console.error('[PAYMENT] Error creating order and PIX:', {
        message: error.message,
        details: error,
        stack: error.stack
      });
      setPaymentStatus('error');
      
      // Mostrar erro específico ao usuário
      toast({
        title: "Erro ao criar pagamento",
        description: error.message || "Não foi possível processar seu pagamento PIX. Tente novamente.",
        variant: "destructive",
        duration: 6000
      });
      
      throw error;
    }
  };

  const startPaymentStatusCheck = (transactionId: string) => {
    const interval = setInterval(() => {
      checkPaymentStatus(transactionId);
    }, 5000);
    
    // Cleanup interval after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 30 * 60 * 1000);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (pixData && timeLeft > 0 && paymentStatus === 'pending') {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (pixData && timeLeft === 0 && paymentStatus === 'pending') {
      setPaymentStatus('expired');
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timeLeft, pixData, paymentStatus]);

  const checkPaymentStatus = async (transactionId?: string) => {
    const txId = transactionId || pixData?.transactionId;
    if (!txId) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: { transactionId: txId }
      });

      if (error) throw error;

      if (data.status === 'paid') {
        setPaymentStatus('success');
        
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pedido foi confirmado com sucesso.",
        });
        
        setTimeout(() => {
          const orderIdToUse = order?.id;
          if (orderIdToUse) {
            navigate(`/order-status/${orderIdToUse}`);
          } else {
            navigate('/orders');
          }
        }, 2000);
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
    }
  };

  // Handlers para pagamento com cartão
  const handleCardPaymentSuccess = async (result: any) => {
    setPaymentResult(result);
    setPaymentStatus('success');
    
    // Limpar dados pendentes e carrinho
    await SecureStorage.remove('pendingOrder');
    clearCart();
    
    // Redirecionar após 3 segundos
    setTimeout(() => {
      navigate(`/order-status/${result.order.id}`);
    }, 3000);
  };

  const handleCardPaymentError = (error: string) => {
    setPaymentStatus('error');
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive"
    });
  };

  const copyPixCode = () => {
    if (pixData?.brCode) {
      navigator.clipboard.writeText(pixData.brCode);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamentos.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  // Success state (para ambos PIX e cartão)
  if (paymentStatus === 'success') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-green-800 mb-4">Pagamento Aprovado!</h2>
            <p className="text-green-700 mb-6">
              Seu pedido foi confirmado e processado com sucesso.
            </p>
            
            {paymentResult && (
              <div className="bg-white rounded-lg p-4 mb-6">
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="font-medium">Pedido:</span>
                    <span>#{paymentResult.order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Valor:</span>
                    <span>{formatCurrency(paymentResult.order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Método:</span>
                    <span>{paymentType === 'pix' ? 'PIX' : 'Cartão de Crédito'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className="text-green-600 font-medium">Aprovado</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-green-600 mb-4">
              Redirecionando para acompanhamento do pedido...
            </p>
            
            <Button 
              onClick={() => {
                const orderIdToUse = paymentResult?.order?.id || order?.id;
                if (orderIdToUse) {
                  navigate(`/order-status/${orderIdToUse}`);
                } else {
                  navigate('/orders');
                }
              }}
              className="gradient-pizza"
            >
              Acompanhar Pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <XCircle className="h-20 w-20 mx-auto text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              {paymentType === 'pix' ? 'Erro no PIX' : 'Pagamento Rejeitado'}
            </h2>
            <p className="text-red-700 mb-6">
              Houve um problema ao processar seu pagamento.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setPaymentStatus('form');
                  if (paymentType === 'pix' && orderData) {
                    createOrderAndPixPayment(orderData);
                  }
                }}
                className="w-full"
              >
                Tentar Novamente
              </Button>
              
              {paymentType === 'card' && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/payment?type=pix')}
                  className="w-full"
                >
                  Pagar com PIX
                </Button>
              )}
              
              <Button 
                variant="ghost"
                onClick={() => navigate('/menu')}
                className="w-full"
              >
                Voltar ao Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired PIX state
  if (paymentStatus === 'expired') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Clock className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Código PIX Expirado</h2>
            <p className="text-yellow-700 mb-4">O tempo para pagamento expirou. Gere um novo código.</p>
            <Button onClick={() => {
              setPaymentStatus('pending');
              if (orderData) {
                createOrderAndPixPayment(orderData);
              } else {
                navigate('/menu');
              }
            }}>
              Gerar Novo Código
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/menu')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {paymentType === 'pix' ? (
            <>
              <QrCode className="h-6 w-6" />
              Pagamento PIX
            </>
          ) : (
            <>
              <CreditCard className="h-6 w-6" />
              Pagamento com Cartão
            </>
          )}
        </h1>
        <p className="text-muted-foreground">
          {paymentType === 'pix' 
            ? `Pedido #${order?.id?.slice(0, 8) || 'Novo'}` 
            : 'Complete os dados para finalizar seu pedido'
          }
        </p>
      </div>

      {/* Pagamento PIX */}
      {paymentType === 'pix' && pixData && (paymentStatus === 'pending' || paymentStatus === 'checking') && (
        <div className="space-y-6">
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Código PIX
                <Badge variant="outline" className="ml-auto">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {pixData.qrCodeUrl && (
                <div className="mb-4">
                  <img 
                    src={pixData.qrCodeUrl}
                    alt="QR Code PIX"
                    className="mx-auto mb-4 max-w-64 w-full"
                  />
                </div>
              )}
              
              <div className="bg-muted p-3 rounded-lg mb-4 break-all text-sm font-mono">
                {pixData.brCode}
              </div>
              
              <Button onClick={copyPixCode} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código PIX
              </Button>
              
              <p className="text-sm text-muted-foreground mt-4">
                Abra seu app de pagamentos, escaneie o QR Code ou cole o código PIX
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pagamento com Cartão */}
      {paymentType === 'card' && paymentStatus === 'form' && orderData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de pagamento */}
          <div className="lg:col-span-2">
            <IntegratedCardPayment
              orderData={orderData}
              onPaymentSuccess={handleCardPaymentSuccess}
              onPaymentError={handleCardPaymentError}
            />
          </div>

          {/* Resumo do pedido - sempre mostrar quando há dados */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Itens */}
                  <div className="space-y-2">
                    {orderData.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name || `Item ${index + 1}`}</span>
                        <span>{formatCurrency(item.total_price || (item.unit_price * item.quantity))}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  {/* Subtotal */}
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(orderData.total_amount - (orderData.delivery_fee || 0))}</span>
                  </div>
                  
                  {/* Taxa de entrega */}
                  <div className="flex justify-between">
                    <span>Taxa de entrega</span>
                    <span className={orderData.delivery_fee > 0 ? '' : 'text-green-600'}>
                      {orderData.delivery_fee > 0 ? formatCurrency(orderData.delivery_fee) : 'Grátis'}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  {/* Total */}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(orderData.total_amount)}</span>
                  </div>
                  
                  {/* Método de entrega */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                    {orderData.delivery_method === 'delivery' ? (
                      <>
                        <Truck className="h-3 w-3" />
                        <span>Entrega</span>
                      </>
                    ) : (
                      <>
                        <Store className="h-3 w-3" />
                        <span>Retirada no balcão</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Resumo do pedido para PIX */}
      {paymentType === 'pix' && order && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.total_amount - order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de entrega</span>
                <span className={order.delivery_fee > 0 ? '' : 'text-green-600'}>
                  {order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'Grátis'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Payment;