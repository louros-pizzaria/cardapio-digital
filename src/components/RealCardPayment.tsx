import { useState, useEffect } from 'react';
import { validateCPF } from '@/utils/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Lock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';

interface RealCardPaymentProps {
  orderData: any; // Unified order data for creating order with payment
  onPaymentSuccess: () => void;
}

interface CardData {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  securityCode: string;
  installments: string;
  holderEmail: string;
  holderDocument: string;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const RealCardPayment = ({ orderData, onPaymentSuccess }: RealCardPaymentProps) => {
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    securityCode: '',
    installments: '1',
    holderEmail: '',
    holderDocument: ''
  });
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mercadoPago, setMercadoPago] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMercadoPagoSDK();
  }, []);

  const loadMercadoPagoSDK = async () => {
    try {
      // Get payment configuration from secure endpoint
      const { data: config, error } = await supabase.functions.invoke('get-payment-config');
      
      if (error || !config?.mercadoPagoPublicKey) {
        console.error('Error getting payment config:', error);
        toast({
          title: "Erro de configuração",
          description: "Não foi possível carregar as configurações de pagamento.",
          variant: "destructive",
        });
        return;
      }

      // Load MercadoPago SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      
      script.onload = async () => {
        try {
          const mp = new window.MercadoPago(config.mercadoPagoPublicKey, {
            locale: 'pt-BR'
          });
          setMercadoPago(mp);
          console.log('MercadoPago SDK loaded successfully');
        } catch (error) {
          console.error('Error initializing MercadoPago:', error);
          toast({
            title: "Erro de inicialização",
            description: "Erro ao inicializar sistema de pagamento.",
            variant: "destructive",
          });
        }
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading MercadoPago SDK:', error);
      toast({
        title: "Erro de carregamento",
        description: "Erro ao carregar sistema de pagamento.",
        variant: "destructive",
      });
    }
  };

  const validateCard = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Card number validation
    const cardNumber = cardData.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.number = 'Número do cartão inválido';
    }

    // Holder name validation
    if (!cardData.holderName.trim()) {
      newErrors.holderName = 'Nome do titular é obrigatório';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cardData.holderEmail || !emailRegex.test(cardData.holderEmail)) {
      newErrors.holderEmail = 'Email válido é obrigatório';
    }

    // Document validation (CPF) - Use proper validation
    const document = cardData.holderDocument.replace(/\D/g, '');
    if (!document || document.length !== 11) {
      newErrors.holderDocument = 'CPF deve ter 11 dígitos';
    } else if (!validateCPF(cardData.holderDocument)) {
      newErrors.holderDocument = 'CPF inválido';
    }

    // Expiry validation
    if (!cardData.expiryMonth || !cardData.expiryYear) {
      newErrors.expiry = 'Data de validade é obrigatória';
    }

    // Security code validation
    if (!cardData.securityCode || cardData.securityCode.length < 3) {
      newErrors.securityCode = 'Código de segurança inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '');
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleInputChange = (field: keyof CardData, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'securityCode') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    } else if (field === 'holderName') {
      formattedValue = value.toUpperCase();
    } else if (field === 'holderDocument') {
      formattedValue = formatCPF(value);
    }

    setCardData(prev => ({
      ...prev,
      [field]: formattedValue
    }));

    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const createCardToken = async () => {
    if (!mercadoPago) {
      throw new Error('MercadoPago SDK not loaded');
    }

    const cardToken = await mercadoPago.createCardToken({
      cardNumber: cardData.number.replace(/\s/g, ''),
      cardholderName: cardData.holderName,
      cardExpirationMonth: cardData.expiryMonth,
      cardExpirationYear: `20${cardData.expiryYear}`,
      securityCode: cardData.securityCode,
      identificationType: 'CPF',
      identificationNumber: cardData.holderDocument.replace(/\D/g, '')
    });

    if (cardToken.error) {
      throw new Error(cardToken.error.message);
    }

    return cardToken.id;
  };

  const processPayment = async () => {
    if (!validateCard()) {
      toast({
        title: "Dados inválidos",
        description: "Verifique os dados do cartão e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');

    try {
      // FASE 3: Verificar se orderData tem orderId
      if (!orderData?.orderId) {
        console.error('[CARD] Missing orderId in orderData');
        throw new Error('ID do pedido não encontrado. Refaça o processo de checkout.');
      }

      console.log('[CARD] Processing payment for order:', orderData.orderId);
      
      // Create card token with MercadoPago
      const cardToken = await createCardToken();
      
      console.log('[CARD] Card token created, processing payment');
      
      // Send payment data to backend with orderId
      const { data, error } = await supabase.functions.invoke('process-card-payment', {
        body: {
          orderId: orderData.orderId, // ✅ CORRETO agora!
          cardToken,
          installments: parseInt(cardData.installments),
          payer: {
            email: cardData.holderEmail,
            identification: {
              type: 'CPF',
              number: cardData.holderDocument.replace(/\D/g, '')
            }
          }
        }
      });

      console.log('[CARD] Payment response:', data);

      if (error) {
        console.error('[CARD] Payment error:', error);
        throw new Error(error.message);
      }

      if (data.status === 'approved') {
        console.log('[CARD] Payment approved');
        setPaymentStatus('success');
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pedido foi processado com sucesso.",
        });
        onPaymentSuccess();
      } else {
        console.error('[CARD] Payment not approved:', data.status);
        throw new Error(data.message || 'Pagamento rejeitado');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast({
        title: "Pagamento rejeitado",
        description: error.message || "Tente novamente ou use outro cartão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInstallmentsOptions = () => {
    const maxInstallments = 12;
    const options = [];

    for (let i = 1; i <= maxInstallments; i++) {
      const value = (orderData?.total_amount || 0) / i;
      const text = i === 1 
        ? `1x de ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros`
        : `${i}x de ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
      
      options.push(
        <SelectItem key={i} value={i.toString()}>
          {text}
        </SelectItem>
      );
    }

    return options;
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Processando...
        </Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprovado
        </Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Rejeitado
        </Badge>;
      default:
        return null;
    }
  };

  if (paymentStatus === 'success') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-700 mb-2">
            Pagamento aprovado!
          </h3>
          <p className="text-muted-foreground">
            Seu pedido foi processado com sucesso e será preparado em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <CreditCard className="w-5 h-5 mr-2" />
            Cartão de Crédito
          </CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Lock className="w-4 h-4 mr-1" />
          Pagamento seguro com MercadoPago
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Holder Email */}
        <div>
          <Label htmlFor="holderEmail">Email do titular</Label>
          <Input
            id="holderEmail"
            type="email"
            placeholder="seu@email.com"
            value={cardData.holderEmail}
            onChange={(e) => handleInputChange('holderEmail', e.target.value)}
            className={errors.holderEmail ? 'border-red-500' : ''}
          />
          {errors.holderEmail && (
            <p className="text-red-500 text-sm mt-1">{errors.holderEmail}</p>
          )}
        </div>

        {/* Holder Document */}
        <div>
          <Label htmlFor="holderDocument">CPF do titular</Label>
          <Input
            id="holderDocument"
            placeholder="000.000.000-00"
            value={cardData.holderDocument}
            onChange={(e) => handleInputChange('holderDocument', e.target.value)}
            maxLength={14}
            className={errors.holderDocument ? 'border-red-500' : ''}
          />
          {errors.holderDocument && (
            <p className="text-red-500 text-sm mt-1">{errors.holderDocument}</p>
          )}
        </div>

        {/* Card Number */}
        <div>
          <Label htmlFor="cardNumber">Número do cartão</Label>
          <Input
            id="cardNumber"
            placeholder="0000 0000 0000 0000"
            value={cardData.number}
            onChange={(e) => handleInputChange('number', e.target.value)}
            maxLength={19}
            className={errors.number ? 'border-red-500' : ''}
          />
          {errors.number && (
            <p className="text-red-500 text-sm mt-1">{errors.number}</p>
          )}
        </div>

        {/* Holder Name */}
        <div>
          <Label htmlFor="holderName">Nome do titular</Label>
          <Input
            id="holderName"
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            value={cardData.holderName}
            onChange={(e) => handleInputChange('holderName', e.target.value)}
            className={errors.holderName ? 'border-red-500' : ''}
          />
          {errors.holderName && (
            <p className="text-red-500 text-sm mt-1">{errors.holderName}</p>
          )}
        </div>

        {/* Expiry and Security Code */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="expiryMonth">Mês</Label>
            <Select value={cardData.expiryMonth} onValueChange={(value) => handleInputChange('expiryMonth', value)}>
              <SelectTrigger className={errors.expiry ? 'border-red-500' : ''}>
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                    {month.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="expiryYear">Ano</Label>
            <Select value={cardData.expiryYear} onValueChange={(value) => handleInputChange('expiryYear', value)}>
              <SelectTrigger className={errors.expiry ? 'border-red-500' : ''}>
                <SelectValue placeholder="AA" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i).map(year => (
                  <SelectItem key={year} value={year.toString().slice(-2)}>
                    {year.toString().slice(-2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="securityCode">CVV</Label>
            <Input
              id="securityCode"
              placeholder="000"
              value={cardData.securityCode}
              onChange={(e) => handleInputChange('securityCode', e.target.value)}
              maxLength={4}
              className={errors.securityCode ? 'border-red-500' : ''}
            />
          </div>
        </div>
        
        {errors.expiry && (
          <p className="text-red-500 text-sm">{errors.expiry}</p>
        )}
        {errors.securityCode && (
          <p className="text-red-500 text-sm">{errors.securityCode}</p>
        )}

        {/* Installments */}
        <div>
          <Label htmlFor="installments">Parcelamento</Label>
          <Select value={cardData.installments} onValueChange={(value) => handleInputChange('installments', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getInstallmentsOptions()}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={processPayment}
          disabled={loading || paymentStatus === 'processing' || !mercadoPago}
          className="w-full gradient-pizza"
          size="lg"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Processando pagamento...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pagar {(orderData?.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </>
          )}
        </Button>

        {!mercadoPago && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Carregando sistema de pagamento...
            </p>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Houve um problema com o pagamento. Verifique os dados e tente novamente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};