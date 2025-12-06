// ===== SISTEMA DE MENSAGENS PADRONIZADAS ===== 

export interface SystemMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class MessageSystem {
  private static instance: MessageSystem;

  private constructor() {}

  public static getInstance(): MessageSystem {
    if (!MessageSystem.instance) {
      MessageSystem.instance = new MessageSystem();
    }
    return MessageSystem.instance;
  }

  // ===== MENSAGENS DE AUTENTICAÇÃO =====
  auth = {
    loginSuccess: (): SystemMessage => ({
      type: 'success',
      title: 'Login realizado com sucesso',
      description: 'Você foi autenticado e será redirecionado em instantes.'
    }),
    loginError: (error?: string): SystemMessage => ({
      type: 'error',
      title: 'Erro no login',
      description: error || 'Verifique suas credenciais e tente novamente.'
    }),
    logoutSuccess: (): SystemMessage => ({
      type: 'info',
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso.'
    }),
    sessionExpired: (): SystemMessage => ({
      type: 'warning',
      title: 'Sessão expirada',
      description: 'Sua sessão foi encerrada. Faça login novamente para continuar.'
    }),
    passwordResetSent: (): SystemMessage => ({
      type: 'success',
      title: 'Email enviado',
      description: 'Verifique sua caixa de entrada para redefinir sua senha.'
    }),
    passwordResetError: (): SystemMessage => ({
      type: 'error',
      title: 'Erro ao enviar email',
      description: 'Não foi possível enviar o email de recuperação. Tente novamente.'
    }),
    accountBlocked: (): SystemMessage => ({
      type: 'error',
      title: 'Conta bloqueada',
      description: 'Sua conta foi temporariamente bloqueada por segurança.'
    }),
    temporaryBlock: (minutes: number): SystemMessage => ({
      type: 'warning',
      title: 'Acesso bloqueado temporariamente',
      description: `Aguarde ${minutes} minuto(s) para tentar novamente.`
    }),
    registrationSuccess: (): SystemMessage => ({
      type: 'success',
      title: 'Conta criada com sucesso',
      description: 'Sua conta foi criada. Bem-vindo!'
    }),
    registrationError: (error?: string): SystemMessage => ({
      type: 'error',
      title: 'Erro no cadastro',
      description: error || 'Não foi possível criar sua conta. Tente novamente.'
    })
  };

  // ===== MENSAGENS DE PEDIDOS =====
  orders = {
    created: (orderNumber?: string): SystemMessage => ({
      type: 'success',
      title: 'Pedido criado com sucesso',
      description: orderNumber ? `Pedido #${orderNumber} foi criado e está sendo processado.` : 'Seu pedido foi criado e está sendo processado.'
    }),
    processing: (): SystemMessage => ({
      type: 'info',
      title: 'Processando pedido',
      description: 'Seu pedido está sendo preparado. Acompanhe o status em tempo real.'
    }),
    ready: (orderNumber: string): SystemMessage => ({
      type: 'success',
      title: 'Pedido pronto',
      description: `Seu pedido #${orderNumber} está pronto para entrega/retirada!`
    }),
    cancelled: (): SystemMessage => ({
      type: 'warning',
      title: 'Pedido cancelado',
      description: 'Seu pedido foi cancelado. O reembolso será processado em até 5 dias úteis.'
    }),
    stockError: (productName: string): SystemMessage => ({
      type: 'error',
      title: 'Produto indisponível',
      description: `${productName} não possui estoque suficiente no momento.`
    }),
    itemRemoved: (): SystemMessage => ({
      type: 'info',
      title: 'Item removido',
      description: 'Item removido do carrinho.'
    }),
    itemRemovedNamed: (itemName: string): SystemMessage => ({
      type: 'info',
      title: 'Item removido',
      description: `${itemName} foi removido do carrinho.`
    }),
    cartCleared: (): SystemMessage => ({
      type: 'info',
      title: 'Carrinho limpo',
      description: 'Todos os itens foram removidos do carrinho.'
    }),
    rateLimitExceeded: (): SystemMessage => ({
      type: 'warning',
      title: 'Muitos cliques',
      description: 'Aguarde um momento antes de tentar novamente.'
    }),
    cashOrderCreated: (orderNumber: string): SystemMessage => ({
      type: 'success',
      title: 'Pedido criado',
      description: `Pedido #${orderNumber} criado com pagamento em dinheiro.`
    }),
    orderCreated: (orderNumber: string): SystemMessage => ({
      type: 'success',
      title: 'Pedido confirmado',
      description: `Pedido #${orderNumber} foi confirmado e está sendo preparado.`
    })
  };

  // ===== MENSAGENS DE PAGAMENTO =====
  payments = {
    processing: (): SystemMessage => ({
      type: 'info',
      title: 'Processando pagamento',
      description: 'Aguarde enquanto processamos seu pagamento...'
    }),
    success: (method: string): SystemMessage => ({
      type: 'success',
      title: 'Pagamento aprovado',
      description: `Pagamento via ${method} foi processado com sucesso.`
    }),
    failed: (reason?: string): SystemMessage => ({
      type: 'error',
      title: 'Falha no pagamento',
      description: reason || 'Não foi possível processar o pagamento. Tente novamente.'
    }),
    pixGenerated: (): SystemMessage => ({
      type: 'info',
      title: 'PIX gerado',
      description: 'Escaneie o QR Code ou copie o código PIX para efetuar o pagamento.'
    }),
    pixExpired: (): SystemMessage => ({
      type: 'warning',
      title: 'PIX expirado',
      description: 'O código PIX expirou. Gere um novo código para continuar.'
    })
  };

  // ===== MENSAGENS DO SISTEMA =====
  system = {
    loading: (action: string): SystemMessage => ({
      type: 'info',
      title: 'Carregando',
      description: `${action}...`
    }),
    saveSuccess: (item: string): SystemMessage => ({
      type: 'success',
      title: 'Salvo com sucesso',
      description: `${item} foi salvo com sucesso.`
    }),
    deleteSuccess: (item: string): SystemMessage => ({
      type: 'success',
      title: 'Excluído com sucesso',
      description: `${item} foi excluído com sucesso.`
    }),
    networkError: (): SystemMessage => ({
      type: 'error',
      title: 'Erro de conexão',
      description: 'Verifique sua conexão com a internet e tente novamente.'
    }),
    validationError: (field: string): SystemMessage => ({
      type: 'error',
      title: 'Dados inválidos',
      description: `Por favor, verifique o campo: ${field}`
    }),
    permissionDenied: (): SystemMessage => ({
      type: 'error',
      title: 'Acesso negado',
      description: 'Você não tem permissão para realizar esta ação.'
    })
  };

  // ===== MENSAGENS DE VALIDAÇÃO =====
  validation = {
    cpfInvalid: (): SystemMessage => ({
      type: 'error',
      title: 'CPF inválido',
      description: 'Por favor, insira um CPF válido (apenas números).'
    }),
    phoneInvalid: (): SystemMessage => ({
      type: 'error',
      title: 'Telefone inválido',
      description: 'Por favor, insira um telefone válido com DDD.'
    }),
    emailInvalid: (): SystemMessage => ({
      type: 'error',
      title: 'Email inválido',
      description: 'Por favor, insira um endereço de email válido.'
    }),
    emailUnavailable: (): SystemMessage => ({
      type: 'error',
      title: 'Email já cadastrado',
      description: 'Este email já está sendo usado. Tente outro ou faça login.'
    }),
    passwordWeak: (requirements: string[]): SystemMessage => ({
      type: 'warning',
      title: 'Senha fraca',
      description: `Sua senha deve conter: ${requirements.join(', ')}`
    }),
    addressInvalid: (): SystemMessage => ({
      type: 'error',
      title: 'Endereço inválido',
      description: 'Por favor, verifique os dados do endereço.'
    }),
    zipCodeNotFound: (): SystemMessage => ({
      type: 'error',
      title: 'CEP não encontrado',
      description: 'CEP não encontrado. Verifique e tente novamente.'
    }),
    emailRequired: (): SystemMessage => ({
      type: 'error',
      title: 'Email obrigatório',
      description: 'Por favor, informe seu email para continuar.'
    }),
    validCEP: (): SystemMessage => ({
      type: 'success',
      title: 'CEP válido',
      description: 'CEP encontrado e dados preenchidos automaticamente.'
    }),
    invalidCEP: (): SystemMessage => ({
      type: 'error',
      title: 'CEP inválido',
      description: 'CEP não encontrado. Verifique o código e tente novamente.'
    }),
    fixErrors: (): SystemMessage => ({
      type: 'warning',
      title: 'Dados incompletos',
      description: 'Por favor, corrija os campos destacados para continuar.'
    }),
    invalidCardData: (): SystemMessage => ({
      type: 'error',
      title: 'Dados do cartão inválidos',
      description: 'Verifique os dados do cartão e tente novamente.'
    })
  };

  // ===== MENSAGENS DE PAGAMENTO (ALIAS PARA COMPATIBILIDADE) =====
  payment = {
    processing: (): SystemMessage => this.payments.processing(),
    success: (method: string): SystemMessage => this.payments.success(method),
    failed: (reason?: string): SystemMessage => this.payments.failed(reason),
    pixGenerated: (): SystemMessage => this.payments.pixGenerated(),
    pixExpired: (): SystemMessage => this.payments.pixExpired(),
    pixError: (): SystemMessage => ({
      type: 'error',
      title: 'Erro no PIX',
      description: 'Não foi possível gerar o código PIX. Tente novamente.'
    }),
    paymentConfirmed: (): SystemMessage => ({
      type: 'success',
      title: 'Pagamento confirmado',
      description: 'Seu pagamento foi processado com sucesso.'
    }),
    pixCodeCopied: (): SystemMessage => ({
      type: 'success',
      title: 'Código PIX copiado',
      description: 'O código PIX foi copiado para a área de transferência.'
    }),
    copyError: (): SystemMessage => ({
      type: 'error',
      title: 'Erro ao copiar',
      description: 'Não foi possível copiar o código PIX.'
    }),
    cardPaymentSuccess: (): SystemMessage => ({
      type: 'success',
      title: 'Pagamento aprovado',
      description: 'Seu pagamento com cartão foi aprovado.'
    }),
    cardPaymentFailed: (): SystemMessage => ({
      type: 'error',
      title: 'Pagamento negado',
      description: 'Seu pagamento com cartão foi negado.'
    }),
    cardPaymentError: (): SystemMessage => ({
      type: 'error',
      title: 'Erro no pagamento',
      description: 'Erro ao processar pagamento com cartão.'
    })
  };

  // ===== MENSAGENS CONTEXTUAIS =====
  contextual = {
    firstTimeUser: (): SystemMessage => ({
      type: 'info',
      title: 'Bem-vindo!',
      description: 'Complete seu perfil para ter a melhor experiência.'
    }),
    cartReminder: (itemCount: number): SystemMessage => ({
      type: 'info',
      title: 'Itens no carrinho',
      description: `Você tem ${itemCount} ${itemCount === 1 ? 'item' : 'itens'} esperando no carrinho.`
    }),
    subscriptionExpiring: (days: number): SystemMessage => ({
      type: 'warning',
      title: 'Assinatura expirando',
      description: `Sua assinatura expira em ${days} dias. Renove para continuar usando todos os recursos.`
    }),
    maintenanceMode: (): SystemMessage => ({
      type: 'warning',
      title: 'Manutenção programada',
      description: 'Sistema em manutenção. Algumas funcionalidades podem estar indisponíveis.'
    })
  };

  // ===== FUNÇÃO UTILITÁRIA PARA CRIAR MENSAGENS CUSTOMIZADAS =====
  custom = (type: SystemMessage['type'], title: string, description: string, duration?: number): SystemMessage => ({
    type,
    title,
    description,
    duration
  });
}

export const messageSystem = MessageSystem.getInstance();

// ===== HELPERS PARA TOAST =====
export const showMessage = (message: SystemMessage, toast: any) => {
  const variant = message.type === 'error' ? 'destructive' : 'default';
  
  toast({
    title: message.title,
    description: message.description,
    variant,
    duration: message.duration || 5000,
    action: message.action
  });
};

// ===== MENSAGENS DE CONTEXTO INLINE =====
export const inlineHelp = {
  password: "Use pelo menos 8 caracteres com letras, números e símbolos",
  cpf: "Digite apenas os números do CPF",
  phone: "Digite com DDD: (11) 99999-9999",
  address: "Endereço completo para entrega precisa",
  paymentCard: "Seus dados são protegidos com criptografia SSL"
};