// ===== VALIDAÇÃO DE CHECKOUT COM ZOD =====
// Previne XSS, data corruption e strings excessivamente longas

import { z } from 'zod';

// ===== REGEX PATTERNS =====
const SAFE_TEXT_PATTERN = /^[a-zA-Z0-9À-ÿ\s\-.,áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]+$/;
const PHONE_PATTERN = /^[1-9]{2}9?[0-9]{8}$/; // Formato: DDD + número
const UNSAFE_CHARS_PATTERN = /<script|javascript:|onerror=|onclick=|<iframe|eval\(|alert\(/i;

// ===== HELPER FUNCTIONS =====
const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[\r\n\t]/g, ' ') // Remove quebras de linha e tabs
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .slice(0, 500); // Limite global de segurança
};

const detectXSS = (str: string): boolean => {
  return UNSAFE_CHARS_PATTERN.test(str);
};

// ===== ZOD SCHEMAS =====

// Schema para endereço de entrega
export const addressSchema = z.object({
  street: z
    .string()
    .min(3, 'Rua deve ter pelo menos 3 caracteres')
    .max(200, 'Rua não pode ter mais de 200 caracteres')
    .transform(sanitizeString)
    .refine((val) => !detectXSS(val), 'Caracteres inválidos detectados')
    .refine((val) => SAFE_TEXT_PATTERN.test(val), 'Use apenas letras, números e pontuação básica'),
  
  number: z
    .string()
    .min(1, 'Número é obrigatório')
    .max(20, 'Número não pode ter mais de 20 caracteres')
    .transform(sanitizeString)
    .refine((val) => !detectXSS(val), 'Caracteres inválidos detectados'),
  
  neighborhood: z
    .string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100, 'Bairro não pode ter mais de 100 caracteres')
    .transform(sanitizeString)
    .refine((val) => !detectXSS(val), 'Caracteres inválidos detectados')
    .refine((val) => SAFE_TEXT_PATTERN.test(val), 'Use apenas letras, números e pontuação básica'),
  
  complement: z
    .string()
    .max(200, 'Complemento não pode ter mais de 200 caracteres')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined)
    .refine((val) => !val || !detectXSS(val), 'Caracteres inválidos detectados'),
  
  reference_point: z
    .string()
    .max(200, 'Ponto de referência não pode ter mais de 200 caracteres')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined)
    .refine((val) => !val || !detectXSS(val), 'Caracteres inválidos detectados'),
  
  city: z
    .string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade não pode ter mais de 100 caracteres')
    .transform(sanitizeString)
    .refine((val) => !detectXSS(val), 'Caracteres inválidos detectados')
    .refine((val) => SAFE_TEXT_PATTERN.test(val), 'Use apenas letras, números e pontuação básica')
    .optional(),
  
  state: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Use sigla do estado em maiúsculas (ex: SP)')
    .optional(),
  
  zip_code: z
    .string()
    .optional()
    .transform(val => val || undefined)
});

// Schema para informações do cliente
export const customerInfoSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .transform(sanitizeString)
    .refine((val) => !detectXSS(val), 'Caracteres inválidos detectados')
    .refine((val) => /^[a-zA-ZÀ-ÿ\s]+$/.test(val), 'Nome deve conter apenas letras'),
  
  phone: z
    .string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(15, 'Telefone não pode ter mais de 15 dígitos')
    .transform((val) => val.replace(/\D/g, '')) // Remove não-dígitos
    .refine((val) => PHONE_PATTERN.test(val), 'Formato de telefone inválido. Use (DDD) 9XXXX-XXXX'),
  
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'Email não pode ter mais de 255 caracteres')
    .toLowerCase()
    .refine((val) => !detectXSS(val), 'Caracteres inválidos detectados')
    .optional()
});

// Schema para notas do pedido
export const orderNotesSchema = z
  .string()
  .max(500, 'Notas não podem ter mais de 500 caracteres')
  .transform((val) => val ? sanitizeString(val) : '')
  .refine((val) => !detectXSS(val), 'Caracteres inválidos nas notas')
  .optional();

// Schema para item do carrinho
export const cartItemSchema = z.object({
  product_id: z.string().uuid('ID do produto inválido'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(100, 'Quantidade máxima é 100'),
  unit_price: z.number().min(0, 'Preço não pode ser negativo').max(100000, 'Preço muito alto'),
  total_price: z.number().min(0, 'Total não pode ser negativo'),
  customizations: z.any().optional()
});

// Schema para pedido completo
export const orderDataSchema = z.object({
  user_id: z.string().uuid('ID do usuário inválido').optional(),
  delivery_method: z.enum(['delivery', 'pickup'], {
    errorMap: () => ({ message: 'Método de entrega inválido' })
  }),
  total_amount: z.number().min(0, 'Valor total não pode ser negativo').max(1000000, 'Valor total muito alto'),
  delivery_fee: z.number().min(0, 'Taxa de entrega não pode ser negativa').max(100, 'Taxa de entrega muito alta'),
  payment_method: z.enum(['pix', 'credit_card_online', 'debit_card_online', 'cash', 'credit_card', 'debit_card'], {
    errorMap: () => ({ message: 'Método de pagamento inválido' })
  }),
  customer_name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .transform(sanitizeString)
    .refine((val) => !detectXSS(val), 'Caracteres inválidos no nome'),
  customer_phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val === '' || PHONE_PATTERN.test(val), 'Formato de telefone inválido'),
  notes: orderNotesSchema,
  items: z.array(cartItemSchema).min(1, 'Pedido deve ter pelo menos 1 item').max(50, 'Máximo de 50 itens por pedido'),
  addressData: z.any().optional() // Validado separadamente se necessário
});

// ===== FUNÇÕES DE VALIDAÇÃO =====

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export const validateAddress = (data: any): ValidationResult => {
  try {
    const validated = addressSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Erro desconhecido na validação do endereço'] };
  }
};

export const validateCustomerInfo = (data: any): ValidationResult => {
  try {
    const validated = customerInfoSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Erro desconhecido na validação dos dados do cliente'] };
  }
};

export const validateOrderData = (data: any): ValidationResult => {
  try {
    const validated = orderDataSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Erro desconhecido na validação do pedido'] };
  }
};

// ===== VALIDAÇÃO ESPECÍFICA PARA DELIVERY =====
export const validateDeliveryData = (data: {
  customerInfo: any;
  address: any;
  orderData: any;
}): ValidationResult => {
  const errors: string[] = [];
  
  // Validar informações do cliente
  const customerResult = validateCustomerInfo(data.customerInfo);
  if (!customerResult.success) {
    errors.push(...(customerResult.errors || []));
  }
  
  // Validar endereço
  const addressResult = validateAddress(data.address);
  if (!addressResult.success) {
    errors.push(...(addressResult.errors || []));
  }
  
  // Validar pedido
  const orderResult = validateOrderData(data.orderData);
  if (!orderResult.success) {
    errors.push(...(orderResult.errors || []));
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return {
    success: true,
    data: {
      customerInfo: customerResult.data,
      address: addressResult.data,
      orderData: orderResult.data
    }
  };
};

// ===== EXPORTS DE TIPOS =====
export type AddressInput = z.infer<typeof addressSchema>;
export type CustomerInfoInput = z.infer<typeof customerInfoSchema>;
export type OrderDataInput = z.infer<typeof orderDataSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
