// 🔒 SECURE LOGGER - Mascara dados sensíveis em logs
// Implementado na Fase 3.2 - Logs Seguros

// Tipos de dados sensíveis para mascarar
export type SensitiveDataType = 
  | 'cpf' 
  | 'phone' 
  | 'email' 
  | 'pix_key' 
  | 'token' 
  | 'card_number'
  | 'cvv'
  | 'password'
  | 'customer_name';

interface MaskConfig {
  showStart: number;
  showEnd: number;
  maskChar: string;
}

// Configurações de mascaramento por tipo
const MASK_CONFIGS: Record<SensitiveDataType, MaskConfig> = {
  cpf: { showStart: 3, showEnd: 2, maskChar: '*' },
  phone: { showStart: 3, showEnd: 4, maskChar: '*' },
  email: { showStart: 1, showEnd: 0, maskChar: '***' },
  pix_key: { showStart: 4, showEnd: 3, maskChar: '***' },
  token: { showStart: 10, showEnd: 0, maskChar: '***' },
  card_number: { showStart: 4, showEnd: 4, maskChar: '****' },
  cvv: { showStart: 0, showEnd: 0, maskChar: '***' },
  password: { showStart: 0, showEnd: 0, maskChar: '********' },
  customer_name: { showStart: 2, showEnd: 0, maskChar: '***' }
};

/**
 * Mascara dado sensível
 */
export function mask(value: string | null | undefined, type: SensitiveDataType): string {
  if (!value || value.trim() === '') return 'NOT_PROVIDED';
  
  const config = MASK_CONFIGS[type];
  const str = String(value).trim();
  
  if (str.length <= (config.showStart + config.showEnd)) {
    return config.maskChar;
  }
  
  const start = str.substring(0, config.showStart);
  const end = config.showEnd > 0 ? str.substring(str.length - config.showEnd) : '';
  
  return `${start}${config.maskChar}${end}`;
}

/**
 * Mascara objeto recursivamente
 */
export function maskObject(obj: any, sensitiveKeys: Record<string, SensitiveDataType>): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskObject(item, sensitiveKeys));
  }
  
  const masked: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys[key]) {
      masked[key] = mask(value as string, sensitiveKeys[key]);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskObject(value, sensitiveKeys);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Logger seguro - substitui console.log
 */
export class SecureLogger {
  private context: string;
  private sensitiveKeys: Record<string, SensitiveDataType>;
  
  constructor(context: string, sensitiveKeys: Record<string, SensitiveDataType> = {}) {
    this.context = context;
    this.sensitiveKeys = {
      // Padrão para todos os contextos
      cpf: 'cpf',
      customer_cpf: 'cpf',
      customer_phone: 'phone',
      phone: 'phone',
      email: 'email',
      customer_email: 'email',
      pix_key: 'pix_key',
      br_code: 'pix_key',
      qr_code: 'pix_key',
      authorization: 'token',
      token: 'token',
      password: 'password',
      card_number: 'card_number',
      cardNumber: 'card_number',
      cvv: 'cvv',
      card_token: 'token',
      cardToken: 'token',
      mercadopago_access_token: 'token',
      stripe_secret_key: 'token',
      stripe_customer_id: 'token',
      subscription_id: 'token',
      mercadopago_payment_id: 'token',
      external_reference: 'token',
      ...sensitiveKeys
    };
  }
  
  private formatLog(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const maskedData = data ? maskObject(data, this.sensitiveKeys) : undefined;
    const dataStr = maskedData ? ` - ${JSON.stringify(maskedData)}` : '';
    return `[${timestamp}] [${this.context}] ${level} ${message}${dataStr}`;
  }
  
  log(message: string, data?: any) {
    console.log(this.formatLog('', message, data));
  }
  
  info(message: string, data?: any) {
    console.log(this.formatLog('ℹ️', message, data));
  }
  
  warn(message: string, data?: any) {
    console.log(this.formatLog('⚠️', message, data));
  }
  
  error(message: string, data?: any) {
    console.log(this.formatLog('❌', message, data));
  }
  
  success(message: string, data?: any) {
    console.log(this.formatLog('✅', message, data));
  }
  
  security(action: string, data: any) {
    console.log(this.formatLog('🔒 SECURITY', action, data));
  }
}

/**
 * Factory para criar loggers por edge function
 */
export function createLogger(functionName: string, extraSensitiveKeys?: Record<string, SensitiveDataType>) {
  return new SecureLogger(functionName, extraSensitiveKeys);
}
