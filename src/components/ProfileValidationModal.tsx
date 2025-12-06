// ===== MODAL DE VALIDAÇÃO DE PERFIL - BLOQUEIA CHECKOUT ATÉ COMPLETAR =====

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useUnifiedProfile';
import { validatePhone, validateCPF } from '@/utils/validation';
import { User, Phone, CreditCard, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileValidationModalProps {
  open: boolean;
  onComplete: () => void;
  deliveryMethod: 'delivery' | 'pickup';
}

export const ProfileValidationModal = ({ open, onComplete, deliveryMethod }: ProfileValidationModalProps) => {
  const { toast } = useToast();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
    cpf: ''
  });

  // Preencher dados existentes do perfil
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCpf(profile.cpf || '');
    }
  }, [profile]);

  // Validar em tempo real
  const validateField = (field: 'fullName' | 'phone' | 'cpf', value: string) => {
    let error = '';
    
    switch (field) {
      case 'fullName':
        if (!value.trim()) {
          error = 'Nome completo é obrigatório';
        } else if (value.trim().length < 3) {
          error = 'Nome muito curto';
        } else if (value.trim().length > 100) {
          error = 'Nome muito longo';
        }
        break;
        
      case 'phone':
        if (deliveryMethod === 'delivery') {
          if (!value.trim()) {
            error = 'Telefone é obrigatório para entregas';
          } else if (!validatePhone(value)) {
            error = 'Telefone inválido (ex: 11987654321)';
          }
        }
        break;
        
      case 'cpf':
        if (value.trim() && !validateCPF(value)) {
          error = 'CPF inválido';
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos os campos
    const isNameValid = validateField('fullName', fullName);
    const isPhoneValid = validateField('phone', phone);
    const isCpfValid = validateField('cpf', cpf);
    
    if (!isNameValid || !isPhoneValid || !isCpfValid) {
      toast({
        title: "Dados inválidos",
        description: "Corrija os erros antes de continuar",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        cpf: cpf.trim() || undefined
      });
      
      toast({
        title: "✅ Perfil atualizado",
        description: "Agora você pode continuar com seu pedido"
      });
      
      onComplete();
    } catch (error: any) {
      console.error('[PROFILE_VALIDATION] Erro ao atualizar perfil:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const isValid = () => {
    const hasName = fullName.trim().length >= 3;
    const hasPhone = deliveryMethod === 'pickup' || (phone.trim() && validatePhone(phone));
    const cpfValid = !cpf.trim() || validateCPF(cpf);
    
    return hasName && hasPhone && cpfValid;
  };

  const formatPhone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Complete seu perfil</DialogTitle>
          </div>
          <DialogDescription>
            Para continuar com seu pedido, precisamos de algumas informações obrigatórias.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome Completo
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                validateField('fullName', e.target.value);
              }}
              placeholder="João Silva"
              maxLength={100}
              className={cn(errors.fullName && 'border-destructive')}
              required
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Telefone (obrigatório apenas para delivery) */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone
              {deliveryMethod === 'delivery' && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="phone"
              value={formatPhone(phone)}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '');
                setPhone(clean);
                validateField('phone', clean);
              }}
              placeholder="(11) 98765-4321"
              maxLength={15}
              className={cn(errors.phone && 'border-destructive')}
              required={deliveryMethod === 'delivery'}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
            {deliveryMethod === 'delivery' && (
              <p className="text-xs text-muted-foreground">
                Obrigatório para entregas (para contato do entregador)
              </p>
            )}
          </div>

          {/* CPF (opcional mas recomendado) */}
          <div className="space-y-2">
            <Label htmlFor="cpf" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              CPF
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="cpf"
              value={formatCPF(cpf)}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '');
                setCpf(clean);
                validateField('cpf', clean);
              }}
              placeholder="000.000.000-00"
              maxLength={14}
              className={cn(errors.cpf && 'border-destructive')}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Recomendado para emissão de nota fiscal
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-pizza"
            disabled={!isValid() || saving || profileLoading}
          >
            {saving ? 'Salvando...' : 'Continuar com Pedido'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
