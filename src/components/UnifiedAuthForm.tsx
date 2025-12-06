// ===== FORMULÁRIO DE AUTENTICAÇÃO UNIFICADO =====

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from './AuthLayout';
import { Eye, EyeOff, Loader2, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logLoginAttempt, logAccountBlock } from '@/utils/securityLogger';
import { FormattedInput } from './FormattedInput';
import { PasswordInput } from './PasswordInput';
import { validateCEPWithAPI } from '@/utils/cepValidation';
import { validateCPF, validateEmail, validatePhone } from '@/utils/validation';
import { messageSystem, showMessage } from '@/utils/messageSystem';

type AuthMode = 'login' | 'register';
type RegisterStep = 1 | 2 | 3;

interface UnifiedAuthFormProps {
  initialMode?: AuthMode;
}

export const UnifiedAuthForm = ({ initialMode = 'login' }: UnifiedAuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [currentStep, setCurrentStep] = useState<RegisterStep>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCEP, setIsValidatingCEP] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      reference: '',
      zipCode: ''
    }
  });

  const { signIn, signUp } = useUnifiedAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Security constants
  const MAX_ATTEMPTS = 5;
  const BLOCK_DURATION = 15 * 60 * 1000;

  // Check block status on mount
  useEffect(() => {
    const checkBlockStatus = () => {
      const blockData = localStorage.getItem('login_block');
      if (blockData) {
        const { timestamp, attempts } = JSON.parse(blockData);
        const timeElapsed = Date.now() - timestamp;
        
        if (timeElapsed < BLOCK_DURATION && attempts >= MAX_ATTEMPTS) {
          setIsBlocked(true);
          setAttemptCount(attempts);
          setBlockTimeLeft(Math.ceil((BLOCK_DURATION - timeElapsed) / 1000 / 60));
        } else if (timeElapsed >= BLOCK_DURATION) {
          localStorage.removeItem('login_block');
          setAttemptCount(0);
        } else {
          setAttemptCount(attempts);
        }
      }
    };
    
    checkBlockStatus();
    
    const interval = setInterval(() => {
      if (isBlocked) {
        const blockData = localStorage.getItem('login_block');
        if (blockData) {
          const { timestamp } = JSON.parse(blockData);
          const newTimeLeft = Math.ceil((BLOCK_DURATION - (Date.now() - timestamp)) / 1000 / 60);
          if (newTimeLeft <= 0) {
            setIsBlocked(false);
            setAttemptCount(0);
            setBlockTimeLeft(0);
            localStorage.removeItem('login_block');
          } else {
            setBlockTimeLeft(newTimeLeft);
          }
        }
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isBlocked]);

  // ===== LOGIN LOGIC =====
  const handleFailedAttempt = async (errorMessage: string) => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    
    await logLoginAttempt(loginData.email, false, errorMessage);
    
    localStorage.setItem('login_block', JSON.stringify({
      timestamp: Date.now(),
      attempts: newAttemptCount
    }));
    
    if (newAttemptCount >= MAX_ATTEMPTS) {
      setIsBlocked(true);
      setBlockTimeLeft(15);
      setErrorMessage(`Muitas tentativas falhadas. Tente novamente em 15 minutos.`);
      
      await logAccountBlock(loginData.email, newAttemptCount);
      
      showMessage(messageSystem.auth.accountBlocked(), toast);
    } else {
      const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
      setErrorMessage(`${errorMessage}. ${remainingAttempts} tentativa(s) restante(s).`);
    }
  };

  const getErrorMessage = (error: any): string => {
    const errorMsg = error?.message || '';
    
    if (errorMsg.includes('Invalid login credentials')) {
      return 'Email ou senha incorretos';
    }
    if (errorMsg.includes('Email not confirmed')) {
      return 'Confirme seu email antes de fazer login';
    }
    if (errorMsg.includes('Too many requests')) {
      return 'Muitas tentativas. Aguarde um momento';
    }
    if (errorMsg.includes('Network')) {
      return 'Erro de conexão. Verifique sua internet';
    }
    
    return 'Erro no login. Tente novamente';
  };

  // ✅ ERRO 8 FIX: Form submit com preventDefault adequado
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // ✅ Prevenir propagação
    
    if (isBlocked) {
      showMessage(messageSystem.auth.temporaryBlock(blockTimeLeft), toast);
      return;
    }
    
    // Validação simples antes de prosseguir
    if (!loginData.email || !loginData.password) {
      setErrorMessage('Preencha todos os campos');
      return;
    }
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('[LOGIN] Already loading, ignoring submit');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    setValidationErrors({});
    
    try {
      await signIn(loginData.email, loginData.password);
      
      // Success - clear security blocks
      localStorage.removeItem('login_block');
      setAttemptCount(0);
      setErrorMessage('');
      
      // Navigation is handled by signIn
    } catch (error: any) {
      // Handle failed login attempt
      const friendlyErrorMessage = getErrorMessage(error);
      await handleFailedAttempt(friendlyErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      showMessage(messageSystem.validation.emailRequired(), toast);
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      showMessage(messageSystem.auth.passwordResetSent(), toast);
    } catch (error: any) {
      showMessage(messageSystem.auth.passwordResetError(), toast);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== REGISTER LOGIC =====
  const validateCurrentStep = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (currentStep === 1) {
      if (!registerData.name.trim()) errors.name = 'Nome é obrigatório';
      if (!validateEmail(registerData.email)) errors.email = 'Email inválido';
      if (!validatePhone(registerData.phone)) errors.phone = 'Telefone inválido';
      if (!validateCPF(registerData.cpf)) errors.cpf = 'CPF inválido';
    } else if (currentStep === 2) {
      // CEP não é obrigatório
      if (!registerData.address.street.trim()) errors.street = 'Rua é obrigatória';
      if (!registerData.address.number.trim()) errors.number = 'Número é obrigatório';
      if (!registerData.address.neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório';
    } else if (currentStep === 3) {
      if (!registerData.password) errors.password = 'Senha é obrigatória';
      if (registerData.password !== registerData.confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCEPValidation = async (cep: string) => {
    if (cep.replace(/\D/g, '').length === 8) {
      setIsValidatingCEP(true);
      const cepData = await validateCEPWithAPI(cep);
      setIsValidatingCEP(false);
      
      if (cepData) {
        setRegisterData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            zipCode: cep,
            street: cepData.logradouro || prev.address.street,
            neighborhood: cepData.bairro || prev.address.neighborhood
          }
        }));
        showMessage(messageSystem.validation.validCEP(), toast);
      } else {
        showMessage(messageSystem.validation.invalidCEP(), toast);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      showMessage(messageSystem.validation.fixErrors(), toast);
      return;
    }
    
    if (currentStep === 1) {
      // Validar CPF com RPC do Supabase antes de avançar
      try {
        const { data: cpfValid, error } = await supabase
          .rpc('validate_cpf_format', { cpf_input: registerData.cpf });
        
        if (error || !cpfValid) {
          setValidationErrors({ ...validationErrors, cpf: 'CPF inválido' });
          toast({
            title: "CPF inválido", 
            description: "Por favor, verifique o CPF informado.",
            variant: "destructive" 
          });
          return;
        }
      } catch (error) {
        console.error('CPF validation error:', error);
        toast({
          title: "Erro ao validar CPF", 
          description: "Tente novamente.",
          variant: "destructive" 
        });
        return;
      }
      
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else {
      setIsLoading(true);
      try {
        await signUp(registerData.email, registerData.password, registerData);
        showMessage(messageSystem.auth.registrationSuccess(), toast);
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Registration error:', error);
        showMessage(messageSystem.auth.registrationError(error.message), toast);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ===== UI HELPERS =====
  const getTitle = () => {
    if (mode === 'login') return 'Entrar na sua conta';
    
    switch (currentStep) {
      case 1: return 'Dados pessoais';
      case 2: return 'Endereço de entrega';
      case 3: return 'Senha e confirmação';
      default: return 'Criar conta';
    }
  };

  const getDescription = () => {
    if (mode === 'login') return 'Digite seus dados para acessar o cardápio exclusivo';
    
    switch (currentStep) {
      case 1: return 'Precisamos de alguns dados básicos';
      case 2: return 'Para entregas rápidas e precisas';
      case 3: return 'Finalize seu cadastro';
      default: return 'Preencha os dados para criar sua conta';
    }
  };

  const getToggleText = () => {
    if (mode === 'login') return 'Não tem conta? Criar nova conta';
    if (mode === 'register' && currentStep === 1) return 'Já tem conta? Fazer login';
    return '';
  };

  const handleToggle = () => {
    if (mode === 'login') {
      setMode('register');
      setCurrentStep(1);
    } else if (mode === 'register' && currentStep === 1) {
      setMode('login');
    }
  };

  // ===== RENDER FUNCTIONS =====
  const renderLoginForm = () => (
    <form 
      onSubmit={handleLogin} 
      className="space-y-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={loginData.email}
          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Digite sua senha"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            required
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Button 
        type="submit"
        className="w-full gradient-pizza text-white border-0"
        disabled={isLoading || isBlocked}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>

      <Button 
        variant="link" 
        type="button"
        className="w-full text-sm" 
        disabled={isLoading || isBlocked}
        onClick={handleForgotPassword}
      >
        Esqueci minha senha
      </Button>
    </form>
  );

  const renderRegisterStep1 = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo <span className="text-destructive">*</span></Label>
        <Input 
          id="name" 
          placeholder="Seu nome completo" 
          value={registerData.name} 
          onChange={e => setRegisterData({ ...registerData, name: e.target.value })} 
          required 
          disabled={isLoading}
          className={validationErrors.name ? 'border-destructive' : ''}
        />
        {validationErrors.name && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {validationErrors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="seu@email.com" 
          value={registerData.email} 
          onChange={e => setRegisterData({ ...registerData, email: e.target.value })} 
          required 
          disabled={isLoading}
          className={validationErrors.email ? 'border-destructive' : ''}
        />
        {validationErrors.email && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {validationErrors.email}
          </p>
        )}
      </div>

      <FormattedInput
        id="phone"
        label="Telefone"
        type="phone"
        value={registerData.phone}
        onChange={(value) => setRegisterData({ ...registerData, phone: value })}
        placeholder="(11) 99999-9999"
        required
        disabled={isLoading}
      />

      <FormattedInput
        id="cpf"
        label="CPF"
        type="cpf"
        value={registerData.cpf}
        onChange={(value) => setRegisterData({ ...registerData, cpf: value })}
        placeholder="000.000.000-00"
        required
        disabled={isLoading}
      />
    </>
  );

  const renderRegisterStep2 = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="street">Rua</Label>
        <Input 
          id="street" 
          placeholder="Nome da rua" 
          value={registerData.address.street} 
          onChange={e => setRegisterData({
            ...registerData,
            address: { ...registerData.address, street: e.target.value }
          })} 
          required 
          disabled={isLoading} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input 
            id="number" 
            placeholder="123" 
            value={registerData.address.number} 
            onChange={e => setRegisterData({
              ...registerData,
              address: { ...registerData.address, number: e.target.value }
            })} 
            required 
            disabled={isLoading} 
          />
        </div>

        <div className="space-y-2">
          <FormattedInput
            id="zipCode"
            label="CEP"
            type="cep"
            value={registerData.address.zipCode}
            onChange={(value) => {
              setRegisterData({
                ...registerData,
                address: { ...registerData.address, zipCode: value }
              });
              handleCEPValidation(value);
            }}
            placeholder="12345-678"
            required
            disabled={isLoading || isValidatingCEP}
          />
          {isValidatingCEP && (
            <p className="text-sm text-muted-foreground">Validando CEP...</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input 
          id="neighborhood" 
          placeholder="Nome do bairro" 
          value={registerData.address.neighborhood} 
          onChange={e => setRegisterData({
            ...registerData,
            address: { ...registerData.address, neighborhood: e.target.value }
          })} 
          required 
          disabled={isLoading} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="complement">Complemento</Label>
        <Input 
          id="complement" 
          placeholder="Apt, casa, etc. (opcional)" 
          value={registerData.address.complement} 
          onChange={e => setRegisterData({
            ...registerData,
            address: { ...registerData.address, complement: e.target.value }
          })} 
          disabled={isLoading} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Ponto de referência</Label>
        <Input 
          id="reference" 
          placeholder="Próximo ao mercado... (opcional)" 
          value={registerData.address.reference} 
          onChange={e => setRegisterData({
            ...registerData,
            address: { ...registerData.address, reference: e.target.value }
          })} 
          disabled={isLoading} 
        />
      </div>
    </>
  );

  const renderRegisterStep3 = () => (
    <>
      <PasswordInput
        id="password"
        label="Senha"
        value={registerData.password}
        onChange={(value) => setRegisterData({ ...registerData, password: value })}
        placeholder="Crie uma senha segura"
        required
        disabled={isLoading}
        showStrengthIndicator={true}
      />

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha <span className="text-destructive">*</span></Label>
        <Input 
          id="confirmPassword" 
          type="password" 
          placeholder="Digite a senha novamente" 
          value={registerData.confirmPassword} 
          onChange={e => setRegisterData({ ...registerData, confirmPassword: e.target.value })} 
          required 
          disabled={isLoading}
          className={validationErrors.confirmPassword ? 'border-destructive' : ''}
        />
        {validationErrors.confirmPassword && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {validationErrors.confirmPassword}
          </p>
        )}
      </div>
    </>
  );

  const renderRegisterForm = () => (
    <>
      <div className="mb-4">
        <div className="flex space-x-2">
          {[1, 2, 3].map(step => (
            <div 
              key={step} 
              className={`h-2 flex-1 rounded-full ${
                step <= currentStep ? 'gradient-pizza' : 'bg-gray-200'
              }`} 
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Passo {currentStep} de 3
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {currentStep === 1 && renderRegisterStep1()}
        {currentStep === 2 && renderRegisterStep2()}
        {currentStep === 3 && renderRegisterStep3()}

        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCurrentStep((currentStep - 1) as RegisterStep)} 
              className="flex-1" 
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
          <Button 
            type="submit" 
            className="flex-1 gradient-pizza text-white border-0" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {currentStep === 3 ? 'Criando...' : 'Processando...'}
              </>
            ) : (
              currentStep === 3 ? 'Criar conta' : 'Continuar'
            )}
          </Button>
        </div>
      </form>
    </>
  );

  return (
    <AuthLayout
      title={getTitle()}
      description={getDescription()}
      showToggle={mode === 'login' || (mode === 'register' && currentStep === 1)}
      toggleText={getToggleText()}
      onToggle={handleToggle}
    >
      {/* Security Alerts */}
      {isBlocked && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Acesso temporariamente bloqueado</strong><br />
            Muitas tentativas falhadas. Aguarde {blockTimeLeft} minuto(s) para tentar novamente.
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && !isBlocked && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !isBlocked && mode === 'login' && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Atenção:</strong> {attemptCount} de {MAX_ATTEMPTS} tentativas utilizadas.
          </AlertDescription>
        </Alert>
      )}

      {mode === 'login' ? renderLoginForm() : renderRegisterForm()}
    </AuthLayout>
  );
};