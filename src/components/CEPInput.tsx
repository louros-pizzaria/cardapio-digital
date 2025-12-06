// ===== CEP INPUT COM VALIDAÇÃO VIA VIACEP =====

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateCEPWithAPI, type CEPData } from '@/utils/cepValidation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CEPInputProps {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound?: (address: CEPData) => void;
  required?: boolean;
  label?: string;
  className?: string;
}

const formatCEP = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
};

export const CEPInput = ({ 
  value, 
  onChange, 
  onAddressFound, 
  required = false,
  label = 'CEP',
  className 
}: CEPInputProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [addressData, setAddressData] = useState<CEPData | null>(null);

  // Debounce para validação automática
  useEffect(() => {
    const cleanCEP = value.replace(/\D/g, '');
    
    if (cleanCEP.length === 8) {
      const timer = setTimeout(() => {
        validateCEP(cleanCEP);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setValidated(false);
      setError(null);
      setAddressData(null);
    }
  }, [value]);

  const validateCEP = async (cep: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await validateCEPWithAPI(cep);
      
      if (!data) {
        setError('CEP não encontrado');
        setValidated(false);
        setAddressData(null);
      } else {
        setValidated(true);
        setAddressData(data);
        onAddressFound?.(data);
        
        toast({ 
          title: "✅ CEP validado", 
          description: `${data.logradouro || 'Endereço'}, ${data.bairro} - ${data.localidade}/${data.uf}`
        });
      }
    } catch (error) {
      console.error('[CEP_INPUT] Erro ao validar CEP:', error);
      setError('Erro ao validar CEP');
      setValidated(false);
      setAddressData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    onChange(clean);
    
    // Reset validation quando usuário edita
    if (validated) {
      setValidated(false);
      setAddressData(null);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="cep">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id="cep"
          type="text"
          placeholder="00000-000"
          value={formatCEP(value)}
          onChange={handleChange}
          maxLength={9}
          required={required}
          className={cn(
            'pr-10',
            validated && 'border-green-500 focus-visible:ring-green-500',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        
        {!loading && validated && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        
        {!loading && error && (
          <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {validated && addressData && (
        <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
          <p className="font-medium">Endereço encontrado:</p>
          <p>{addressData.logradouro || 'Rua não especificada'}</p>
          <p>{addressData.bairro} - {addressData.localidade}/{addressData.uf}</p>
        </div>
      )}
    </div>
  );
};
