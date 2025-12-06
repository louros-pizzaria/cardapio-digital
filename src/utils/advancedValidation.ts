// ===== SISTEMA DE VALIDAÇÕES AVANÇADAS =====

import { supabase } from '@/integrations/supabase/client';

// ===== INTERFACES =====
export interface ValidationState {
  isValid: boolean;
  isValidating: boolean;
  error?: string;
  suggestions?: string[];
}

export interface ValidationRule {
  name: string;
  validator: (value: string) => boolean | Promise<boolean>;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}

// ===== VALIDADOR DE CPF COM API EXTERNA =====
export class CPFValidator {
  private static cache = new Map<string, { isValid: boolean; timestamp: number }>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  static isValidFormat(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false; // Sequência repetida
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  }

  static async validateWithAPI(cpf: string): Promise<ValidationState> {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (!this.isValidFormat(cleanCPF)) {
      return { isValid: false, isValidating: false, error: 'Formato de CPF inválido' };
    }

    // Verificar cache
    const cached = this.cache.get(cleanCPF);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { 
        isValid: cached.isValid, 
        isValidating: false,
        error: cached.isValid ? undefined : 'CPF inválido ou em situação irregular'
      };
    }

    try {
      // Simulação de API externa - em produção, usar serviço real
      const isValid = this.isValidFormat(cleanCPF);
      
      // Salvar no cache
      this.cache.set(cleanCPF, { isValid, timestamp: Date.now() });
      
      return { 
        isValid, 
        isValidating: false,
        error: isValid ? undefined : 'CPF inválido'
      };
    } catch (error) {
      return { 
        isValid: false, 
        isValidating: false, 
        error: 'Erro ao validar CPF. Tente novamente.' 
      };
    }
  }
}

// ===== VALIDADOR DE TELEFONE =====
export class PhoneValidator {
  static validateFormat(phone: string): ValidationState {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return { 
        isValid: false, 
        isValidating: false, 
        error: 'Telefone deve ter 10 ou 11 dígitos',
        suggestions: ['(11) 99999-9999', '(11) 9999-9999']
      };
    }
    
    // Validar DDD
    const ddd = cleanPhone.substring(0, 2);
    const validDDDs = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
      '21', '22', '24', // RJ
      '27', '28', // ES
      '31', '32', '33', '34', '35', '37', '38', // MG
      '41', '42', '43', '44', '45', '46', // PR
      '47', '48', '49', // SC
      '51', '53', '54', '55', // RS
      '61', // DF
      '62', '64', // GO
      '63', // TO
      '65', '66', // MT
      '67', // MS
      '68', // AC
      '69', // RO
      '71', '73', '74', '75', '77', // BA
      '79', // SE
      '81', '87', // PE
      '82', // AL
      '83', // PB
      '84', // RN
      '85', '88', // CE
      '86', '89', // PI
      '91', '93', '94', // PA
      '92', '97', // AM
      '95', // RR
      '96', // AP
      '98', '99' // MA
    ];
    
    if (!validDDDs.includes(ddd)) {
      return { 
        isValid: false, 
        isValidating: false, 
        error: 'DDD inválido',
        suggestions: ['Verifique o código de área (DDD)']
      };
    }
    
    return { isValid: true, isValidating: false };
  }

  static async sendSMSVerification(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      // Em produção, usar serviço de SMS real (Twilio, etc.)
      console.log(`SMS de verificação enviado para ${phone}`);
      return { success: true, message: 'Código de verificação enviado via SMS' };
    } catch (error) {
      return { success: false, message: 'Erro ao enviar SMS de verificação' };
    }
  }
}

// ===== VALIDADOR DE EMAIL =====
export class EmailValidator {
  static validateFormat(email: string): ValidationState {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { 
        isValid: false, 
        isValidating: false, 
        error: 'Formato de email inválido',
        suggestions: ['exemplo@dominio.com']
      };
    }
    
    return { isValid: true, isValidating: false };
  }

  static async checkAvailability(email: string): Promise<ValidationState> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }
      
      const isAvailable = !data;
      
      return {
        isValid: isAvailable,
        isValidating: false,
        error: isAvailable ? undefined : 'Este email já está sendo usado'
      };
    } catch (error) {
      return {
        isValid: false,
        isValidating: false,
        error: 'Erro ao verificar disponibilidade do email'
      };
    }
  }
}

// ===== VALIDADOR DE SENHA AVANÇADO =====
export class PasswordValidator {
  static readonly RULES: ValidationRule[] = [
    {
      name: 'minLength',
      validator: (password: string) => password.length >= 8,
      message: 'Pelo menos 8 caracteres',
      severity: 'error'
    },
    {
      name: 'hasUppercase',
      validator: (password: string) => /[A-Z]/.test(password),
      message: 'Pelo menos uma letra maiúscula',
      severity: 'error'
    },
    {
      name: 'hasLowercase',
      validator: (password: string) => /[a-z]/.test(password),
      message: 'Pelo menos uma letra minúscula',
      severity: 'error'
    },
    {
      name: 'hasNumber',
      validator: (password: string) => /\d/.test(password),
      message: 'Pelo menos um número',
      severity: 'error'
    },
    {
      name: 'hasSpecial',
      validator: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      message: 'Pelo menos um caractere especial',
      severity: 'warning'
    },
    {
      name: 'noSequential',
      validator: (password: string) => !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|890)/i.test(password),
      message: 'Evite sequências (123, abc, etc.)',
      severity: 'warning'
    }
  ];

  static validateStrength(password: string): {
    strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    score: number;
    failedRules: ValidationRule[];
    passedRules: ValidationRule[];
  } {
    const results = this.RULES.map(rule => ({
      rule,
      passed: rule.validator(password)
    }));
    
    const failedRules = results.filter(r => !r.passed).map(r => r.rule);
    const passedRules = results.filter(r => r.passed).map(r => r.rule);
    
    const errorCount = failedRules.filter(r => r.severity === 'error').length;
    const warningCount = failedRules.filter(r => r.severity === 'warning').length;
    
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    let score: number;
    
    if (errorCount > 2) {
      strength = 'weak';
      score = 25;
    } else if (errorCount > 0) {
      strength = 'medium';
      score = 50;
    } else if (warningCount > 0) {
      strength = 'strong';
      score = 75;
    } else {
      strength = 'very-strong';
      score = 100;
    }
    
    return { strength, score, failedRules, passedRules };
  }
}

// ===== VALIDADOR DE ENDEREÇO COM GEOLOCALIZAÇÃO =====
export class AddressValidator {
  static async validateCEP(cep: string): Promise<ValidationState & { addressData?: any }> {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      return { 
        isValid: false, 
        isValidating: false, 
        error: 'CEP deve conter 8 dígitos' 
      };
    }
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        return { 
          isValid: false, 
          isValidating: false, 
          error: 'CEP não encontrado' 
        };
      }
      
      return { 
        isValid: true, 
        isValidating: false, 
        addressData: data 
      };
    } catch (error) {
      return { 
        isValid: false, 
        isValidating: false, 
        error: 'Erro ao consultar CEP' 
      };
    }
  }

  static async validateDeliveryZone(address: any): Promise<ValidationState> {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('neighborhood', address.neighborhood?.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      const hasDelivery = !!data;
      
      return {
        isValid: hasDelivery,
        isValidating: false,
        error: hasDelivery ? undefined : 'Área sem cobertura de entrega'
      };
    } catch (error) {
      return {
        isValid: false,
        isValidating: false,
        error: 'Erro ao verificar área de entrega'
      };
    }
  }
}

// ===== DETECTOR DE DADOS DUPLICADOS =====
export class DuplicateDetector {
  static async checkDuplicateProfile(data: {
    cpf?: string;
    phone?: string;
    email?: string;
    excludeUserId?: string;
  }): Promise<{ duplicates: string[]; details: any[] }> {
    const duplicates: string[] = [];
    const details: any[] = [];
    
    try {
      let query = supabase.from('profiles').select('*');
      
      if (data.excludeUserId) {
        query = query.neq('id', data.excludeUserId);
      }
      
      if (data.cpf) {
        const { data: cpfDuplicates } = await query.eq('cpf', data.cpf);
        if (cpfDuplicates && cpfDuplicates.length > 0) {
          duplicates.push('CPF');
          details.push(...cpfDuplicates);
        }
      }
      
      if (data.phone) {
        const { data: phoneDuplicates } = await query.eq('phone', data.phone);
        if (phoneDuplicates && phoneDuplicates.length > 0) {
          duplicates.push('Telefone');
          details.push(...phoneDuplicates);
        }
      }
      
      if (data.email) {
        const { data: emailDuplicates } = await query.eq('email', data.email.toLowerCase());
        if (emailDuplicates && emailDuplicates.length > 0) {
          duplicates.push('Email');
          details.push(...emailDuplicates);
        }
      }
      
      return { duplicates, details };
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
      return { duplicates: [], details: [] };
    }
  }
}

// ===== CLASSE PRINCIPAL DE VALIDAÇÃO =====
export class AdvancedValidator {
  private static instance: AdvancedValidator;
  
  private constructor() {}
  
  public static getInstance(): AdvancedValidator {
    if (!AdvancedValidator.instance) {
      AdvancedValidator.instance = new AdvancedValidator();
    }
    return AdvancedValidator.instance;
  }
  
  // ===== VALIDAÇÃO COMPLETA DE PERFIL =====
  async validateCompleteProfile(profileData: {
    email: string;
    cpf?: string;
    phone?: string;
    password?: string;
    excludeUserId?: string;
  }): Promise<{
    isValid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string>;
  }> {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    
    // Validar email
    const emailValidation = EmailValidator.validateFormat(profileData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error || 'Email inválido';
    } else {
      const emailAvailability = await EmailValidator.checkAvailability(profileData.email);
      if (!emailAvailability.isValid) {
        errors.email = emailAvailability.error || 'Email indisponível';
      }
    }
    
    // Validar CPF
    if (profileData.cpf) {
      const cpfValidation = await CPFValidator.validateWithAPI(profileData.cpf);
      if (!cpfValidation.isValid) {
        errors.cpf = cpfValidation.error || 'CPF inválido';
      }
    }
    
    // Validar telefone
    if (profileData.phone) {
      const phoneValidation = PhoneValidator.validateFormat(profileData.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error || 'Telefone inválido';
      }
    }
    
    // Validar senha
    if (profileData.password) {
      const passwordStrength = PasswordValidator.validateStrength(profileData.password);
      const criticalErrors = passwordStrength.failedRules.filter(r => r.severity === 'error');
      const warningErrors = passwordStrength.failedRules.filter(r => r.severity === 'warning');
      
      if (criticalErrors.length > 0) {
        errors.password = criticalErrors.map(r => r.message).join(', ');
      }
      
      if (warningErrors.length > 0) {
        warnings.password = warningErrors.map(r => r.message).join(', ');
      }
    }
    
    // Verificar duplicatas
    const duplicates = await DuplicateDetector.checkDuplicateProfile({
      cpf: profileData.cpf,
      phone: profileData.phone,
      email: profileData.email,
      excludeUserId: profileData.excludeUserId
    });
    
    if (duplicates.duplicates.length > 0) {
      errors.duplicates = `Dados já cadastrados: ${duplicates.duplicates.join(', ')}`;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }
}

export const advancedValidator = AdvancedValidator.getInstance();