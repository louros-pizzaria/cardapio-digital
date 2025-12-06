import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Lock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CardPaymentProps {
  orderId: string;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

interface CardData {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  securityCode: string;
  installments: string;
}

export const CardPayment = ({ orderId, totalAmount, onPaymentSuccess }: CardPaymentProps) => {
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    securityCode: '',
    installments: '1'
  });
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Load MercadoPago SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = initializeMercadoPago;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeMercadoPago = () => {
    // Initialize MercadoPago with public key
    // This would be loaded from your MercadoPago configuration
    console.log('MercadoPago SDK loaded');
  };

  const validateCard = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Card number validation (basic)
    const cardNumber = cardData.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.number = 'Número do cartão inválido';
    }

    // Holder name validation
    if (!cardData.holderName.trim()) {
      newErrors.holderName = 'Nome do titular é obrigatório';
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

  const handleInputChange = (field: keyof CardData, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'securityCode') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    } else if (field === 'holderName') {
      formattedValue = value.toUpperCase();
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
      // Simulate payment processing with MercadoPago
      // In real implementation, you would:
      // 1. Create card token with MercadoPago SDK
      // 2. Send token to your backend
      // 3. Process payment with MercadoPago API

      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate success (in real app, this would come from the API response)
      const success = Math.random() > 0.3; // 70% success rate for demo

      if (success) {
        setPaymentStatus('success');
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pedido foi processado com sucesso.",
        });
        onPaymentSuccess();
      } else {
        throw new Error('Pagamento rejeitado pelo banco');
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
    const installmentValue = totalAmount;
    const options = [];

    for (let i = 1; i <= maxInstallments; i++) {
      const value = installmentValue / i;
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
          disabled={loading || paymentStatus === 'processing'}
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
              Pagar {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </>
          )}
        </Button>

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