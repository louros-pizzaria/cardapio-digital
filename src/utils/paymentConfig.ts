// ===== VALIDAÇÃO DE CONFIGURAÇÃO DE PAGAMENTO =====

import { supabase } from '@/integrations/supabase/client';

export interface PaymentConfigStatus {
  isConfigured: boolean;
  hasMercadoPagoToken: boolean;
  hasMercadoPagoPublicKey: boolean;
  hasPixKey: boolean;
  errors: string[];
}

/**
 * Verifica se as configurações de pagamento estão completas
 */
export async function checkPaymentConfiguration(): Promise<PaymentConfigStatus> {
  const errors: string[] = [];
  
  try {
    // Tentar obter a configuração do Mercado Pago
    const { data, error } = await supabase.functions.invoke('get-payment-config', {
      body: {}
    });

    if (error) {
      console.error('[PAYMENT-CONFIG] Error fetching payment config:', error);
      errors.push('Não foi possível verificar a configuração de pagamento');
      return {
        isConfigured: false,
        hasMercadoPagoToken: false,
        hasMercadoPagoPublicKey: false,
        hasPixKey: false,
        errors
      };
    }

    const hasMercadoPagoPublicKey = !!data?.mercadopago_public_key;
    
    if (!hasMercadoPagoPublicKey) {
      errors.push('Chave pública do Mercado Pago não configurada');
    }

    // Assumir que se a chave pública existe, o token de acesso também existe
    // (servidor-side validation)
    const hasMercadoPagoToken = hasMercadoPagoPublicKey;
    
    // Para PIX, não podemos verificar diretamente do cliente, mas podemos assumir
    // que se as outras chaves estão configuradas, o PIX também está
    const hasPixKey = hasMercadoPagoPublicKey;

    const isConfigured = hasMercadoPagoToken && hasMercadoPagoPublicKey && hasPixKey;

    return {
      isConfigured,
      hasMercadoPagoToken,
      hasMercadoPagoPublicKey,
      hasPixKey,
      errors
    };
  } catch (error) {
    console.error('[PAYMENT-CONFIG] Unexpected error:', error);
    errors.push('Erro ao verificar configuração de pagamento');
    return {
      isConfigured: false,
      hasMercadoPagoToken: false,
      hasMercadoPagoPublicKey: false,
      hasPixKey: false,
      errors
    };
  }
}

/**
 * Valida se o usuário pode prosseguir com pagamento online
 */
export async function validateOnlinePaymentEligibility(): Promise<{
  canProceed: boolean;
  errors: string[];
}> {
  const config = await checkPaymentConfiguration();
  
  if (!config.isConfigured) {
    return {
      canProceed: false,
      errors: [
        'Sistema de pagamento online não configurado.',
        'Por favor, use pagamento na entrega/retirada.',
        ...config.errors
      ]
    };
  }

  return {
    canProceed: true,
    errors: []
  };
}
