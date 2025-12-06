import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useUnifiedProfile';
import { useToast } from '@/hooks/use-toast';

interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
  required: boolean;
}

interface UseEnhancedValidationProps {
  deliveryMethod: 'delivery' | 'pickup';
  checkoutStep: 'cart' | 'address' | 'payment';
}

export const useEnhancedValidation = ({ 
  deliveryMethod, 
  checkoutStep 
}: UseEnhancedValidationProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Regras de validação dinâmicas baseadas no contexto
  const getValidationRules = (): ValidationRule[] => {
    const rules: ValidationRule[] = [
      {
        field: 'full_name',
        validator: (value) => value && value.trim().length >= 2,
        message: 'Nome completo é obrigatório (mínimo 2 caracteres)',
        required: true
      }
    ];

    // Validação de telefone para delivery
    if (deliveryMethod === 'delivery') {
      rules.push({
        field: 'phone',
        validator: (value) => value && /^\d{10,11}$/.test(value.replace(/\D/g, '')),
        message: 'Telefone é obrigatório para entrega (formato: (11) 99999-9999)',
        required: true
      });
    }

    // Validações específicas por etapa
    if (checkoutStep === 'address' && deliveryMethod === 'delivery') {
      rules.push({
        field: 'address',
        validator: () => profile?.id ? true : false, // Verificar se há endereço cadastrado
        message: 'Endereço de entrega é obrigatório',
        required: true
      });
    }

    return rules;
  };

  // Executar validação
  const validateProfile = () => {
    const rules = getValidationRules();
    const errors: string[] = [];

    rules.forEach(rule => {
      if (rule.required) {
        const fieldValue = profile?.[rule.field as keyof typeof profile];
        
        if (!rule.validator(fieldValue)) {
          errors.push(rule.message);
        }
      }
    });

    setValidationErrors(errors);
    setIsValid(errors.length === 0);

    // Mostrar toast apenas para erros críticos na etapa de pagamento
    if (checkoutStep === 'payment' && errors.length > 0) {
      toast({
        title: "Dados Incompletos",
        description: `Complete: ${errors.slice(0, 2).join(', ')}`,
        variant: "destructive"
      });
    }

    return errors.length === 0;
  };

  // Validação automática quando dados mudam
  useEffect(() => {
    if (profile) {
      validateProfile();
    }
  }, [profile, deliveryMethod, checkoutStep]);

  // Validação específica para campos
  const validateField = (field: string, value: any): boolean => {
    const rules = getValidationRules();
    const rule = rules.find(r => r.field === field);
    
    if (!rule) return true;
    
    return rule.validator(value);
  };

  // Obter mensagem de erro para campo específico
  const getFieldError = (field: string): string | null => {
    const rules = getValidationRules();
    const rule = rules.find(r => r.field === field);
    
    if (!rule) return null;
    
    const fieldValue = profile?.[field as keyof typeof profile];
    return rule.validator(fieldValue) ? null : rule.message;
  };

  return {
    isValid,
    validationErrors,
    validateProfile,
    validateField,
    getFieldError,
    hasErrors: validationErrors.length > 0,
    errorCount: validationErrors.length
  };
};