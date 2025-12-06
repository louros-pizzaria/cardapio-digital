import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Lock, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PaymentButton } from '@/components/ProtectedButton';
import { useOrderProtection } from '@/hooks/useOrderProtection';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { checkPaymentRateLimit } from '@/utils/rateLimiting';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface IntegratedCardPaymentProps {
  orderData: any;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

interface CardForm {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  installments: string;
  identificationType: string;
  identificationNumber: string;
}

export const IntegratedCardPayment = ({ orderData, onPaymentSuccess, onPaymentError }: IntegratedCardPaymentProps) => {
  const { user } = useUnifiedAuth();
  const { protectOrderCreation } = useOrderProtection();
  const [cardForm, setCardForm] = useState<CardForm>({
    cardNumber: '',
    cardholderName: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    installments: '1',
    identificationType: 'CPF',
    identificationNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mp, setMp] = useState<any>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [issuerId, setIssuerId] = useState<string>('');
  const [installmentOptions, setInstallmentOptions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    initializeMercadoPago();
  }, []);

  const initializeMercadoPago = async () => {
    try {
      // Carregar SDK do MercadoPago
      if (!window.MercadoPago) {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.onload = () => {
          initializeMPInstance();
        };
        document.head.appendChild(script);
      } else {
        initializeMPInstance();
      }
    } catch (error) {
      console.error('Error loading MercadoPago SDK:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar sistema de pagamento",
        variant: "destructive"
      });
    }
  };

  const initializeMPInstance = async () => {
    try {
      setSdkLoading(true);
      
      // Obter chave pública do MercadoPago
      const { data, error } = await supabase.functions.invoke('get-payment-config');
      
      if (error) throw error;
      
      const mercadoPago = new window.MercadoPago(data.mercadopago_public_key, {
        locale: 'pt-BR'
      });
      
      setMp(mercadoPago);
      console.log('MercadoPago SDK initialized successfully');
    } catch (error) {
      console.error('Error initializing MercadoPago:', error);
      toast({
        title: "Erro",
        description: "Erro ao inicializar sistema de pagamento",
        variant: "destructive"
      });
    } finally {
      setSdkLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar número do cartão
    const cardNumber = cardForm.cardNumber.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.cardNumber = 'Número do cartão inválido';
    }

    // Validar nome do titular
    if (!cardForm.cardholderName.trim()) {
      newErrors.cardholderName = 'Nome do titular é obrigatório';
    }

    // Validar data de vencimento
    if (!cardForm.expirationMonth || !cardForm.expirationYear) {
      newErrors.expiration = 'Data de vencimento é obrigatória';
    }

    // Validar código de segurança
    if (!cardForm.securityCode || cardForm.securityCode.length < 3) {
      newErrors.securityCode = 'Código de segurança inválido';
    }

    // Validar CPF
    if (!cardForm.identificationNumber || cardForm.identificationNumber.replace(/\D/g, '').length !== 11) {
      newErrors.identificationNumber = 'CPF inválido';
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
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return v;
  };

  const handleInputChange = (field: keyof CardForm, value: string) => {
    let formattedValue = value;
    
    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
      
      // Detectar método de pagamento quando o número do cartão mudar
      if (mp && value.length >= 6) {
        detectPaymentMethod(value.replace(/\s/g, ''));
      }
    } else if (field === 'securityCode') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    } else if (field === 'cardholderName') {
      formattedValue = value.toUpperCase();
    } else if (field === 'identificationNumber') {
      formattedValue = formatCPF(value);
    }

    setCardForm(prev => ({
      ...prev,
      [field]: formattedValue
    }));

    // Limpar erro específico quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const detectPaymentMethod = async (cardNumber: string) => {
    if (!mp || cardNumber.length < 6) return;

    try {
      const paymentMethod = await mp.getPaymentMethod({
        cardNumber: cardNumber
      });

      if (paymentMethod) {
        setPaymentMethodId(paymentMethod.id);
        
        // Obter opções de parcelamento
        getInstallments(cardNumber, orderData.total_amount);
        
        // Obter issuer se necessário
        if (paymentMethod.additional_info_needed.includes('issuer_id')) {
          getIssuers(paymentMethod.id);
        }
      }
    } catch (error) {
      console.error('Error detecting payment method:', error);
    }
  };

  const getInstallments = async (cardNumber: string, amount: number) => {
    if (!mp || !paymentMethodId) return;

    try {
      const installments = await mp.getInstallments({
        payment_method_id: paymentMethodId,
        amount: amount
      });

      if (installments && installments[0] && installments[0].payer_costs) {
        setInstallmentOptions(installments[0].payer_costs);
      }
    } catch (error) {
      console.error('Error getting installments:', error);
    }
  };

  const getIssuers = async (paymentMethodId: string) => {
    if (!mp) return;

    try {
      const issuers = await mp.getIssuers({
        payment_method_id: paymentMethodId
      });

      if (issuers && issuers.length > 0) {
        setIssuerId(issuers[0].id);
      }
    } catch (error) {
      console.error('Error getting issuers:', error);
    }
  };

  const createCardToken = async () => {
    if (!mp) throw new Error('MercadoPago não inicializado');

    const tokenData = {
      cardNumber: cardForm.cardNumber.replace(/\s/g, ''),
      cardholderName: cardForm.cardholderName,
      securityCode: cardForm.securityCode,
      expirationMonth: cardForm.expirationMonth,
      expirationYear: `20${cardForm.expirationYear}`,
      identificationType: cardForm.identificationType,
      identificationNumber: cardForm.identificationNumber.replace(/\D/g, '')
    };

    try {
      const token = await mp.createCardToken(tokenData);
      return token;
    } catch (error) {
      console.error('Error creating card token:', error);
      throw new Error('Erro ao processar dados do cartão');
    }
  };

  const processPayment = async () => {
    if (!validateForm()) {
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
      // Criar token do cartão
      const cardToken = await createCardToken();
      
      if (!cardToken || !cardToken.id) {
        throw new Error('Erro ao gerar token do cartão');
      }

      // Preparar dados para enviar ao backend
      const paymentData = {
        orderData,
        cardData: {
          token: cardToken.id,
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          installments: cardForm.installments
        }
      };

      // Enviar para edge function
      const { data, error } = await supabase.functions.invoke('create-order-with-card', {
        body: paymentData
      });

      if (error) throw error;

      if (data.success && data.payment.approved) {
        setPaymentStatus('success');
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pedido foi processado com sucesso.",
        });
        onPaymentSuccess(data);
      } else {
        throw new Error(data.payment.status_detail || 'Pagamento rejeitado');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      const errorMessage = error.message || "Erro ao processar pagamento";
      toast({
        title: "Pagamento rejeitado",
        description: errorMessage,
        variant: "destructive",
      });
      onPaymentError(errorMessage);
    } finally {
      setLoading(false);
    }
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

  // Loading state enquanto SDK carrega
  if (sdkLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Carregando sistema de pagamento...</p>
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
            Cartão de Crédito/Débito
          </CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Lock className="w-4 h-4 mr-1" />
          Pagamento seguro com MercadoPago
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Número do cartão */}
        <div>
          <Label htmlFor="cardNumber">Número do cartão *</Label>
          <Input
            id="cardNumber"
            placeholder="0000 0000 0000 0000"
            value={cardForm.cardNumber}
            onChange={(e) => handleInputChange('cardNumber', e.target.value)}
            maxLength={19}
            className={errors.cardNumber ? 'border-red-500' : ''}
          />
          {errors.cardNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
          )}
        </div>

        {/* Nome do titular */}
        <div>
          <Label htmlFor="cardholderName">Nome do titular *</Label>
          <Input
            id="cardholderName"
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            value={cardForm.cardholderName}
            onChange={(e) => handleInputChange('cardholderName', e.target.value)}
            className={errors.cardholderName ? 'border-red-500' : ''}
          />
          {errors.cardholderName && (
            <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
          )}
        </div>

        {/* Data de vencimento e CVV */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="expirationMonth">Mês *</Label>
            <Select value={cardForm.expirationMonth} onValueChange={(value) => handleInputChange('expirationMonth', value)}>
              <SelectTrigger className={errors.expiration ? 'border-red-500' : ''}>
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
            <Label htmlFor="expirationYear">Ano *</Label>
            <Select value={cardForm.expirationYear} onValueChange={(value) => handleInputChange('expirationYear', value)}>
              <SelectTrigger className={errors.expiration ? 'border-red-500' : ''}>
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
            <Label htmlFor="securityCode">CVV *</Label>
            <Input
              id="securityCode"
              placeholder="000"
              value={cardForm.securityCode}
              onChange={(e) => handleInputChange('securityCode', e.target.value)}
              maxLength={4}
              className={errors.securityCode ? 'border-red-500' : ''}
            />
          </div>
        </div>
        
        {errors.expiration && (
          <p className="text-red-500 text-sm">{errors.expiration}</p>
        )}
        {errors.securityCode && (
          <p className="text-red-500 text-sm">{errors.securityCode}</p>
        )}

        {/* CPF */}
        <div>
          <Label htmlFor="identificationNumber">CPF *</Label>
          <Input
            id="identificationNumber"
            placeholder="000.000.000-00"
            value={cardForm.identificationNumber}
            onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
            maxLength={14}
            className={errors.identificationNumber ? 'border-red-500' : ''}
          />
          {errors.identificationNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.identificationNumber}</p>
          )}
        </div>

        {/* Parcelamento */}
        {installmentOptions.length > 0 && (
          <div>
            <Label htmlFor="installments">Parcelamento</Label>
            <Select value={cardForm.installments} onValueChange={(value) => handleInputChange('installments', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {installmentOptions.map((option, index) => (
                  <SelectItem key={index} value={option.installments.toString()}>
                    {option.installments}x de {option.installment_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    {option.installments === 1 ? ' sem juros' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Botão de pagamento */}
        <PaymentButton 
          onClick={async () => {
            if (!user?.id || !checkPaymentRateLimit(user.id)) {
              toast({
                title: "Muitas tentativas",
                description: "Aguarde antes de tentar novamente.",
                variant: "destructive"
              });
              return;
            }
            await processPayment();
          }}
          disabled={loading || paymentStatus === 'processing' || !mp}
          className="gradient-pizza"
          size="lg"
          loadingText="Processando pagamento..."
        >
          <Lock className="w-4 w-4 mr-2" />
          Pagar {orderData.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </PaymentButton>

        {paymentStatus === 'error' && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Houve um problema com o pagamento. Verifique os dados e tente novamente.
            </p>
          </div>
        )}

        {!mp && (
          <div className="flex items-center justify-center text-orange-600 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Carregando sistema de pagamento...
          </div>
        )}
      </CardContent>
    </Card>
  );
};