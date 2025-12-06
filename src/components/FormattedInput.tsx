import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCPFDynamic, formatPhoneDynamic, formatCEPDynamic, cleanNumeric } from '@/utils/formatting';
import { validateCPF, validatePhone, validateCEP } from '@/utils/validation';
import { useState, useEffect } from 'react';

interface FormattedInputProps {
  id: string;
  label: string;
  type: 'cpf' | 'phone' | 'cep' | 'text';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onValidation?: (isValid: boolean, error?: string) => void;
}

export const FormattedInput = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  onValidation
}: FormattedInputProps) => {
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Aplicar formatação baseada no tipo
    switch (type) {
      case 'cpf':
        newValue = formatCPFDynamic(newValue);
        break;
      case 'phone':
        newValue = formatPhoneDynamic(newValue);
        break;
      case 'cep':
        newValue = formatCEPDynamic(newValue);
        break;
    }
    
    onChange(newValue);
  };

  // Validação em tempo real
  useEffect(() => {
    if (!value || !required) {
      setError('');
      setIsValid(true);
      onValidation?.(true);
      return;
    }

    let validationResult = true;
    let errorMessage = '';

    switch (type) {
      case 'cpf':
        validationResult = validateCPF(value);
        if (!validationResult) {
          errorMessage = 'CPF inválido';
        }
        break;
      case 'phone':
        validationResult = validatePhone(value);
        if (!validationResult) {
          errorMessage = 'Telefone inválido. Use o formato (11) 99999-9999';
        }
        break;
      case 'cep':
        validationResult = validateCEP(value);
        if (!validationResult) {
          errorMessage = 'CEP inválido';
        }
        break;
    }

    setError(errorMessage);
    setIsValid(validationResult);
    onValidation?.(validationResult, errorMessage);
  }, [value, type, required, onValidation]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} {required && <span className="text-destructive">*</span>}</Label>
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={!isValid && error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};