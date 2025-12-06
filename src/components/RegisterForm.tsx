// ===== COMPONENTE DE REGISTRO (FALLBACK PARA COMPATIBILIDADE) =====

import { UnifiedAuthForm } from './UnifiedAuthForm';

interface RegisterFormProps {
  onToggleToLogin: () => void;
}

export const RegisterForm = ({ onToggleToLogin }: RegisterFormProps) => {
  // Backward compatibility - just use UnifiedAuthForm in register mode
  return <UnifiedAuthForm initialMode="register" />;
};