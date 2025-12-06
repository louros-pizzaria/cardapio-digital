// ===== BOTÃO PROTEGIDO CONTRA DUPLICAÇÃO =====

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useProtectedButton } from '@/hooks/useOrderProtection';
import { Loader2 } from 'lucide-react';

interface ProtectedButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => Promise<void>;
  debounceMs?: number;
  enableWhileProcessing?: boolean;
  loadingText?: string;
  protectionDisabled?: boolean;
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  onClick,
  children,
  debounceMs = 1000,
  enableWhileProcessing = false,
  loadingText,
  protectionDisabled = false,
  ...buttonProps
}) => {
  const { executeAction, isDisabled, isLoading } = useProtectedButton(onClick, {
    debounceMs,
    enableWhileProcessing
  });

  const handleClick = protectionDisabled ? onClick : executeAction;
  const isButtonDisabled = protectionDisabled ? false : isDisabled;

  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={isButtonDisabled || buttonProps.disabled || false}
    >
      {isLoading && !protectionDisabled ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText || 'Processando...'}
        </div>
      ) : (
        children
      )}
    </Button>
  );
};

// Variante específica para botões de checkout
export const CheckoutButton: React.FC<ProtectedButtonProps> = (props) => {
  return (
    <ProtectedButton
      debounceMs={1500} // Reduzido para melhor UX com alta concorrência
      loadingText="Criando pedido..."
      className="w-full gradient-pizza"
      {...props}
    />
  );
};

// Variante específica para botões de pagamento
export const PaymentButton: React.FC<ProtectedButtonProps> = (props) => {
  return (
    <ProtectedButton
      debounceMs={2000} // Reduzido para melhor UX
      loadingText="Processando pagamento..."
      className="w-full"
      {...props}
    />
  );
};