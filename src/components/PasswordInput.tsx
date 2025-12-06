import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { validatePassword } from '@/utils/validation';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showStrengthIndicator?: boolean;
  onValidation?: (isValid: boolean, errors?: string[]) => void;
}

export const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  showStrengthIndicator = true,
  onValidation
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState({ isValid: true, errors: [] as string[] });

  useEffect(() => {
    if (!value) {
      setValidation({ isValid: true, errors: [] });
      onValidation?.(true, []);
      return;
    }

    const result = validatePassword(value);
    setValidation(result);
    onValidation?.(result.isValid, result.errors);
  }, [value, onValidation]);

  const requirements = [
    { text: 'Pelo menos 8 caracteres', test: (pwd: string) => pwd.length >= 8 },
    { text: 'Uma letra maiúscula', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { text: 'Uma letra minúscula', test: (pwd: string) => /[a-z]/.test(pwd) },
    { text: 'Um número', test: (pwd: string) => /\d/.test(pwd) }
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} {required && <span className="text-destructive">*</span>}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={!validation.isValid && value ? 'border-destructive' : ''}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      
      {showStrengthIndicator && value && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Requisitos da senha:</div>
          <div className="space-y-1">
            {requirements.map((req, index) => {
              const isValid = req.test(value);
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {isValid ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={isValid ? 'text-green-600' : 'text-muted-foreground'}>
                    {req.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};