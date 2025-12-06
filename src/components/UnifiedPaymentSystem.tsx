// ===== SISTEMA DE PAGAMENTO UNIFICADO =====

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Loader2, 
  Copy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { messageSystem, showMessage } from '@/utils/messageSystem';

interface UnifiedPaymentSystemProps {
  orderData: any;
  totalAmount: number;
  onPaymentSuccess: () => void;
  onCancel?: () => void;
}

type PaymentMethod = 'pix' | 'credit_card' | 'cash';
type PaymentStep = 'selection' | 'processing' | 'form';
type PaymentStatus = 'pending' | 'checking' | 'success' | 'expired' | 'error' | 'failed';

interface PixData {
  transactionId: string;
  brCode: string;
  qrCodeUrl: string;
  amount: string;
  expiresAt: string;
}

interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
  installments: number;
}

export const UnifiedPaymentSystem = ({ 
  orderData, 
  totalAmount, 
  onPaymentSuccess, 
  onCancel 
}: UnifiedPaymentSystemProps) => {
  // State management
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [currentStep, setCurrentStep] = useState<PaymentStep>('selection');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);
  
  // Payment-specific data
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    installments: 1
  });
  
  // Timer and polling
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [pollingInterval, setPollingInterval] = useState(5000);
  
  // Refs for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  
  const { toast } = useToast();
  const { createPixPayment, createCardPayment, isLoading: mercadoPagoLoading } = useMercadoPago();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      clearAllIntervals();
    };
  }, []);

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

  // ===== PAYMENT METHOD SELECTION =====
  const handleMethodSelect = () => {
    if (selectedMethod === 'cash') {
      handleCashPayment();
      return;
    }
    
    setCurrentStep('processing');
    
    if (selectedMethod === 'pix') {
      createPixOrder();
    } else if (selectedMethod === 'credit_card') {
      setCurrentStep('form');
    }
  };

  const handleCashPayment = () => {
    localStorage.setItem('pendingOrder', JSON.stringify({ 
      ...orderData, 
      payment_method: 'cash' 
    }));
    
    showMessage(messageSystem.orders.created('CASH'), toast);
    onPaymentSuccess();
  };

  // ===== PIX PAYMENT LOGIC =====
  const createPixOrder = async () => {
    try {
      setIsLoading(true);
      setPaymentStatus('pending');
      clearAllIntervals();
      
      const { data, error } = await supabase.functions.invoke('create-order-with-pix', {
        body: orderData
      });

      if (isUnmountedRef.current) return;

      if (error || !data?.order || !data?.pixData?.brCode) {
        throw new Error(error?.message || 'Erro ao gerar PIX');
      }

      setPixData(data.pixData);
      setPaymentStatus('pending');
      setPollingInterval(5000);
      
      localStorage.removeItem('pendingOrder');
      showMessage(messageSystem.orders.created(data.order?.order_number), toast);
      
      startPixTimer(data.pixData.expiresAt);
      startPixPolling(data.pixData.transactionId);
      
    } catch (error: any) {
      if (!isUnmountedRef.current) {
        console.error('[UNIFIED-PAYMENT] PIX creation error:', error);
        setPaymentStatus('error');
        showMessage(messageSystem.payment.pixError(), toast);
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const startPixTimer = (expiresAt: string) => {
    const expirationTime = new Date(expiresAt).getTime();
    
    const updateTimer = () => {
      if (isUnmountedRef.current) return;
      
      const now = Date.now();
      const remaining = Math.max(0, expirationTime - now);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        setPaymentStatus('expired');
        clearAllIntervals();
      }
    };
    
    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);
  };

  const startPixPolling = (transactionId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      if (isUnmountedRef.current || paymentStatus !== 'pending') return;
      
      try {
        setPaymentStatus('checking');
        
        const { data, error } = await supabase.functions.invoke('check-pix-status', {
          body: { transactionId }
        });

        if (isUnmountedRef.current) return;

        if (error) {
          setPaymentStatus('pending');
          return;
        }

        if (data.status === 'paid') {
          setPaymentStatus('success');
          clearAllIntervals();
          showMessage(messageSystem.payment.paymentConfirmed(), toast);
          onPaymentSuccess();
        } else if (data.status === 'expired') {
          setPaymentStatus('expired');
          clearAllIntervals();
        } else {
          setPaymentStatus('pending');
        }
        
        // Increase polling interval to reduce server load
        setPollingInterval(prev => Math.min(prev + 2000, 30000));
      } catch (error) {
        if (!isUnmountedRef.current) {
          setPaymentStatus('pending');
        }
      }
    }, pollingInterval);
  };

  const copyPixCode = async () => {
    if (!pixData) return;
    
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      showMessage(messageSystem.payment.pixCodeCopied(), toast);
    } catch (error) {
      showMessage(messageSystem.payment.copyError(), toast);
    }
  };

  const retryPixPayment = () => {
    setPaymentStatus('pending');
    setPixData(null);
    clearAllIntervals();
    createPixOrder();
  };

  // ===== CARD PAYMENT LOGIC =====
  const handleCardPayment = async () => {
    if (!validateCardData()) {
      showMessage(messageSystem.validation.invalidCardData(), toast);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-order-with-card', {
        body: {
          ...orderData,
          card_data: {
            ...cardData,
            installments: cardData.installments
          }
        }
      });

      if (error) throw error;

      if (data.status === 'approved') {
        showMessage(messageSystem.payment.cardPaymentSuccess(), toast);
        onPaymentSuccess();
      } else {
        showMessage(messageSystem.payment.cardPaymentFailed(), toast);
        setPaymentStatus('failed');
      }
      
    } catch (error: any) {
      console.error('[UNIFIED-PAYMENT] Card payment error:', error);
      showMessage(messageSystem.payment.cardPaymentError(), toast);
      setPaymentStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const validateCardData = (): boolean => {
    return (
      cardData.number.length >= 16 &&
      cardData.expiry.length >= 5 &&
      cardData.cvv.length >= 3 &&
      cardData.name.trim().length > 0
    );
  };

  // ===== UI HELPERS =====
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Aguardando pagamento
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Verificando...
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pagamento aprovado
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Expirado
          </Badge>
        );
      case 'error':
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {paymentStatus === 'error' ? 'Erro' : 'Falhou'}
          </Badge>
        );
      default:
        return null;
    }
  };

  // ===== RENDER METHODS =====
  const renderMethodSelection = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Método de Pagamento</CardTitle>
        <CardDescription>
          Total: {formatPrice(totalAmount)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={selectedMethod} 
          onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}
        >
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="pix" id="pix" />
            <Label htmlFor="pix" className="flex-1 flex items-center space-x-3 cursor-pointer">
              <Smartphone className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">PIX</div>
                <div className="text-sm text-muted-foreground">Aprovação instantânea</div>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="credit_card" id="credit_card" />
            <Label htmlFor="credit_card" className="flex-1 flex items-center space-x-3 cursor-pointer">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">Cartão de Crédito</div>
                <div className="text-sm text-muted-foreground">Parcelamento até 12x</div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash" className="flex-1 flex items-center space-x-3 cursor-pointer">
              <Banknote className="w-5 h-5 text-green-700" />
              <div>
                <div className="font-medium">Dinheiro</div>
                <div className="text-sm text-muted-foreground">Pagamento na entrega</div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <Button 
            onClick={handleMethodSelect}
            className="flex-1 gradient-pizza"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              selectedMethod === 'cash' ? 'Confirmar Pedido' : `Pagar ${formatPrice(totalAmount)}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPixPayment = () => {
    if (isLoading) {
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('selection')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={retryPixPayment} className="flex-1">
                Tentar novamente
              </Button>
            </div>
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
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block border">
                  <img 
                    src={pixData.qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 mx-auto"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Escaneie o QR Code com o app do seu banco
                </p>
              </div>

              <Separator />

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
                    onClick={copyPixCode}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Após o pagamento, a confirmação pode levar alguns segundos.
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep('selection')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={retryPixPayment} className="flex-1">
                  Gerar novo PIX
                </Button>
              </div>
            </div>
          )}

          {(paymentStatus === 'pending' || paymentStatus === 'checking') && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('selection')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos métodos de pagamento
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCardForm = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cartão de Crédito</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentStep('selection')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <CardDescription>
          Total: {formatPrice(totalAmount)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Número do Cartão</Label>
          <Input
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={cardData.number}
            onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '') })}
            maxLength={16}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry">Validade</Label>
            <Input
              id="expiry"
              placeholder="MM/AA"
              value={cardData.expiry}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                  value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
                }
                setCardData({ ...cardData, expiry: value });
              }}
              maxLength={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={cardData.cvv}
              onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
              maxLength={4}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardName">Nome no Cartão</Label>
          <Input
            id="cardName"
            placeholder="NOME COMO IMPRESSO NO CARTÃO"
            value={cardData.name}
            onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installments">Parcelamento</Label>
          <Select 
            value={cardData.installments.toString()} 
            onValueChange={(value) => setCardData({ ...cardData, installments: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(installment => {
                const installmentValue = totalAmount / installment;
                return (
                  <SelectItem key={installment} value={installment.toString()}>
                    {installment}x de {formatPrice(installmentValue)}
                    {installment === 1 ? ' à vista' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {paymentStatus === 'failed' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Pagamento recusado</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Verifique os dados do cartão e tente novamente.
            </p>
          </div>
        )}

        <Button 
          onClick={handleCardPayment}
          className="w-full gradient-pizza"
          size="lg"
          disabled={isLoading || !validateCardData()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando pagamento...
            </>
          ) : (
            `Pagar ${formatPrice(totalAmount)}`
          )}
        </Button>
      </CardContent>
    </Card>
  );

  // ===== MAIN RENDER =====
  if (currentStep === 'selection') {
    return renderMethodSelection();
  }

  if (currentStep === 'processing' || (currentStep === 'form' && selectedMethod === 'pix')) {
    return renderPixPayment();
  }

  if (currentStep === 'form' && selectedMethod === 'credit_card') {
    return renderCardForm();
  }

  return null;
};