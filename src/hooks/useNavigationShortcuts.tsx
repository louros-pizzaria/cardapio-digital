// ===== SISTEMA DE ATALHOS DE NAVEGAÇÃO =====

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRole } from './useUnifiedProfile';
import { useUnifiedAuth } from './useUnifiedAuth';
import { useToast } from './use-toast';

interface ShortcutAction {
  key: string;
  description: string;
  action: () => void;
  condition?: () => boolean;
  category: 'navigation' | 'actions' | 'admin' | 'attendant';
}

export const useNavigationShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useRole();
  const { user } = useUnifiedAuth();
  const { toast } = useToast();

  // ===== DEFINIR ATALHOS =====
  const shortcuts: ShortcutAction[] = [
    // Navegação geral
    {
      key: 'h',
      description: 'Ir para início',
      action: () => navigate('/'),
      category: 'navigation'
    },
    {
      key: 'm',
      description: 'Ir para cardápio',
      action: () => navigate('/menu'),
      category: 'navigation'
    },
    {
      key: 'o',
      description: 'Ver pedidos',
      action: () => navigate('/orders'),
      condition: () => !!user,
      category: 'navigation'
    },
    {
      key: 'a',
      description: 'Minha conta',
      action: () => navigate('/account'),
      condition: () => !!user,
      category: 'navigation'
    },

    // Ações rápidas
    {
      key: 'c',
      description: 'Abrir carrinho',
      action: () => {
        const cartButton = document.querySelector('[data-cart-trigger]') as HTMLButtonElement;
        cartButton?.click();
      },
      category: 'actions'
    },
    {
      key: 's',
      description: 'Buscar produtos',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      },
      category: 'actions'
    },
    {
      key: 'Escape',
      description: 'Fechar modais/drawers',
      action: () => {
        const closeButtons = document.querySelectorAll('[data-close-modal], [data-close-drawer]');
        const lastButton = closeButtons[closeButtons.length - 1] as HTMLButtonElement;
        lastButton?.click();
      },
      category: 'actions'
    },

    // Atalhos de administrador
    {
      key: 'd',
      description: 'Dashboard admin',
      action: () => navigate('/admin/dashboard'),
      condition: () => role?.isAdmin || false,
      category: 'admin'
    },
    {
      key: 'p',
      description: 'Gerenciar produtos',
      action: () => navigate('/admin/products'),
      condition: () => role?.isAdmin || false,
      category: 'admin'
    },
    {
      key: 'r',
      description: 'Ver relatórios',
      action: () => navigate('/analytics'),
      condition: () => role?.isAdmin || false,
      category: 'admin'
    },
    {
      key: 'u',
      description: 'Gerenciar usuários',
      action: () => navigate('/admin/customers'),
      condition: () => role?.isAdmin || false,
      category: 'admin'
    },

    // Atalhos de atendente
    {
      key: 'k',
      description: 'Cozinha',
      action: () => navigate('/attendant/kitchen'),
      condition: () => role?.isAttendant || role?.isAdmin || false,
      category: 'attendant'
    },
    {
      key: 'e',
      description: 'Entregas',
      action: () => navigate('/attendant/delivery'),
      condition: () => role?.isAttendant || role?.isAdmin || false,
      category: 'attendant'
    },
    {
      key: 'n',
      description: 'Novo pedido',
      action: () => {
        if (location.pathname.includes('/admin') || location.pathname.includes('/attendant')) {
          navigate('/admin/orders');
          setTimeout(() => {
            const newOrderButton = document.querySelector('[data-new-order]') as HTMLButtonElement;
            newOrderButton?.click();
          }, 100);
        }
      },
      condition: () => role?.isAttendant || role?.isAdmin || false,
      category: 'attendant'
    }
  ];

  // ===== HANDLER DE TECLADO =====
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignorar se o usuário está digitando em um input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as Element)?.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }

    // Verificar se é combinação de teclas especiais
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isAlt = event.altKey;
    const key = event.key.toLowerCase();

    // Atalhos com Ctrl/Cmd + Alt
    if (isCtrlOrCmd && isAlt) {
      const shortcut = shortcuts.find(s => s.key === key);
      if (shortcut && (!shortcut.condition || shortcut.condition())) {
        event.preventDefault();
        shortcut.action();
        
        toast({
          title: "Atalho executado",
          description: shortcut.description,
          duration: 2000
        });
      }
      return;
    }

    // Atalhos simples (apenas tecla)
    if (!isCtrlOrCmd && !isAlt && !event.shiftKey) {
      const shortcut = shortcuts.find(s => s.key === key);
      if (shortcut && (!shortcut.condition || shortcut.condition())) {
        event.preventDefault();
        shortcut.action();
      }
    }
  }, [shortcuts, toast]);

  // ===== REGISTRAR LISTENERS =====
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // ===== MOSTRAR AJUDA DE ATALHOS =====
  const showShortcutsHelp = useCallback(() => {
    const availableShortcuts = shortcuts.filter(s => !s.condition || s.condition());
    
    const helpContent = availableShortcuts
      .reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) acc[shortcut.category] = [];
        acc[shortcut.category].push(shortcut);
        return acc;
      }, {} as Record<string, ShortcutAction[]>);

    // Em uma implementação real, mostrar em um modal
    console.table(helpContent);
    
    toast({
      title: "Atalhos de teclado",
      description: `${availableShortcuts.length} atalhos disponíveis. Verifique o console para detalhes.`,
      duration: 4000
    });
  }, [shortcuts, toast]);

  // ===== ATALHO PARA MOSTRAR AJUDA (? ou F1) =====
  useEffect(() => {
    const helpHandler = (event: KeyboardEvent) => {
      if (event.key === '?' || event.key === 'F1') {
        event.preventDefault();
        showShortcutsHelp();
      }
    };

    document.addEventListener('keydown', helpHandler);
    return () => document.removeEventListener('keydown', helpHandler);
  }, [showShortcutsHelp]);

  // ===== NAVEGAÇÃO CONTEXTUAL =====
  const getContextualShortcuts = useCallback(() => {
    const currentPath = location.pathname;
    const contextual: ShortcutAction[] = [];

    // Atalhos específicos por página
    if (currentPath === '/menu') {
      contextual.push({
        key: 'f',
        description: 'Filtrar produtos',
        action: () => {
          const filterButton = document.querySelector('[data-filter-trigger]') as HTMLButtonElement;
          filterButton?.click();
        },
        category: 'actions'
      });
    }

    if (currentPath.includes('/admin')) {
      contextual.push({
        key: 'x',
        description: 'Exportar dados',
        action: () => {
          const exportButton = document.querySelector('[data-export-trigger]') as HTMLButtonElement;
          exportButton?.click();
        },
        condition: () => role?.isAdmin || false,
        category: 'admin'
      });
    }

    if (currentPath.includes('/orders')) {
      contextual.push({
        key: 'f5',
        description: 'Atualizar pedidos',
        action: () => {
          window.location.reload();
        },
        category: 'actions'
      });
    }

    return contextual;
  }, [location.pathname, role?.isAdmin]);

  // ===== FUNÇÕES DE NAVEGAÇÃO RÁPIDA =====
  const quickActions = {
    goToLastVisited: () => {
      const lastPath = sessionStorage.getItem('lastVisitedPath');
      if (lastPath && lastPath !== location.pathname) {
        navigate(lastPath);
      }
    },

    toggleTheme: () => {
      const themeToggle = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
      themeToggle?.click();
    },

    quickSearch: (query: string) => {
      navigate(`/menu?search=${encodeURIComponent(query)}`);
    },

    emergencyMode: () => {
      // Modo de emergência - limpar cache, ir para home
      localStorage.clear();
      sessionStorage.clear();
      navigate('/');
      toast({
        title: "Modo de emergência",
        description: "Cache limpo e redirecionado para início",
        variant: "destructive"
      });
    }
  };

  return {
    shortcuts: shortcuts.filter(s => !s.condition || s.condition()),
    contextualShortcuts: getContextualShortcuts(),
    showShortcutsHelp,
    quickActions
  };
};

// ===== COMPONENTE DE INDICADOR DE ATALHOS =====
export const ShortcutIndicator = ({ shortcut }: { shortcut: string }) => {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
      {shortcut}
    </kbd>
  );
};

// ===== COMPONENTE DE HELP OVERLAY =====
export const ShortcutsHelpOverlay = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const { shortcuts, contextualShortcuts } = useNavigationShortcuts();

  if (!isOpen) return null;

  const allShortcuts = [...shortcuts, ...contextualShortcuts];
  const categorized = allShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  const categoryLabels = {
    navigation: 'Navegação',
    actions: 'Ações',
    admin: 'Administração',
    attendant: 'Atendimento'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Atalhos de Teclado</h2>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-6">
            {Object.entries(categorized).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="font-medium mb-2 text-primary">
                  {categoryLabels[category as keyof typeof categoryLabels] || category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-sm">{shortcut.description}</span>
                      <ShortcutIndicator shortcut={shortcut.key.toUpperCase()} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
            <p>Pressione <ShortcutIndicator shortcut="?" /> ou <ShortcutIndicator shortcut="F1" /> para ver esta ajuda</p>
            <p>Use <ShortcutIndicator shortcut="Ctrl+Alt+Tecla" /> para atalhos avançados</p>
          </div>
        </div>
      </div>
    </div>
  );
};