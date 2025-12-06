// ===== BREADCRUMBS INTELIGENTES =====

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useRole } from '@/hooks/useUnifiedProfile';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

interface SmartBreadcrumbProps {
  className?: string;
  showHome?: boolean;
  customItems?: BreadcrumbItem[];
  maxItems?: number;
}

// ===== MAPEAMENTO DE ROTAS =====
const routeMapping: Record<string, (pathname: string, user: any, role: any) => BreadcrumbItem[]> = {
  '/': () => [{ label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> }],
  
  '/menu': () => [
    { label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Cardápio', href: '/menu' }
  ],
  
  '/orders': (pathname, user, role) => {
    const base = [{ label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> }];
    
    if (role?.isAdmin || role?.isAttendant) {
      base.push({ label: 'Pedidos', href: '/orders', icon: undefined });
    } else {
      base.push({ label: 'Meus Pedidos', href: '/orders', icon: undefined });
    }
    
    return base;
  },
  
  '/payment': () => [
    { label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Cardápio', href: '/menu' },
    { label: 'Pagamento', href: '/payment' }
  ],
  
  '/account': () => [
    { label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Minha Conta', href: '/account' }
  ],
  
  '/admin': (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    const items = [
      { label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> },
      { label: 'Administração', href: '/admin/dashboard' }
    ];
    
    if (segments.length > 1) {
      const section = segments[1];
      const sectionMap: Record<string, string> = {
        'dashboard': 'Dashboard',
        'orders': 'Pedidos',
        'products': 'Produtos',
        'stock': 'Estoque',
        'customers': 'Clientes',
        'analytics': 'Relatórios'
      };
      
      if (sectionMap[section]) {
        items.push({ label: sectionMap[section], href: `/admin/${section}` });
      }
    }
    
    return items;
  },
  
  '/attendant': (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    const items = [
      { label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> },
      { label: 'Atendimento', href: '/attendant/dashboard' }
    ];
    
    if (segments.length > 1) {
      const section = segments[1];
      const sectionMap: Record<string, string> = {
        'dashboard': 'Dashboard',
        'orders': 'Pedidos',
        'kitchen': 'Cozinha',
        'delivery': 'Entrega',
        'customers': 'Clientes',
        'reports': 'Relatórios'
      };
      
      if (sectionMap[section]) {
        items.push({ label: sectionMap[section], href: `/attendant/${section}` });
      }
    }
    
    return items;
  }
};

export function SmartBreadcrumb({ 
  className, 
  showHome = true, 
  customItems,
  maxItems = 4
}: SmartBreadcrumbProps) {
  const location = useLocation();
  const { user } = useUnifiedAuth();
  const role = useRole();
  
  // ===== GERAR BREADCRUMBS =====
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;
    
    const pathname = location.pathname;
    
    // Encontrar a função de mapeamento apropriada
    const matchingRoute = Object.keys(routeMapping).find(route => {
      if (route === pathname) return true;
      if (pathname.startsWith(route) && route !== '/') return true;
      return false;
    });
    
    if (matchingRoute && routeMapping[matchingRoute]) {
      return routeMapping[matchingRoute](pathname, user, role);
    }
    
    // Fallback para rota não mapeada
    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    
    if (showHome) {
      items.push({ label: 'Início', href: '/', icon: <Home className="h-4 w-4" /> });
    }
    
    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      items.push({ label, href });
    });
    
    return items;
  };

  const breadcrumbs = generateBreadcrumbs();
  
  // ===== TRUNCAR SE NECESSÁRIO =====
  const displayBreadcrumbs = breadcrumbs.length > maxItems 
    ? [
        breadcrumbs[0],
        { label: '...', href: '#', isActive: false },
        ...breadcrumbs.slice(-2)
      ]
    : breadcrumbs;

  // Marcar o último item como ativo
  if (displayBreadcrumbs.length > 0) {
    displayBreadcrumbs[displayBreadcrumbs.length - 1].isActive = true;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
    >
      {displayBreadcrumbs.map((item, index) => (
        <React.Fragment key={`${item.href}-${index}`}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
          
          {item.label === '...' ? (
            <span className="px-2 py-1">...</span>
          ) : item.isActive ? (
            <span 
              className="flex items-center space-x-1 font-medium text-foreground px-2 py-1 rounded-md bg-muted/50"
              aria-current="page"
            >
              {item.icon}
              <span>{item.label}</span>
            </span>
          ) : (
            <Link 
              to={item.href}
              className="flex items-center space-x-1 hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ===== BREADCRUMB COM AÇÕES =====
interface ActionBreadcrumbProps extends SmartBreadcrumbProps {
  actions?: React.ReactNode;
}

export function ActionBreadcrumb({ actions, ...props }: ActionBreadcrumbProps) {
  return (
    <div className="flex items-center justify-between">
      <SmartBreadcrumb {...props} />
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
}

// ===== BREADCRUMB CONTEXTUAL =====
export function ContextualBreadcrumb() {
  const location = useLocation();
  const role = useRole();
  
  const getContextualActions = () => {
    const pathname = location.pathname;
    
    if (pathname.includes('/admin/orders')) {
      return (
        <div className="flex space-x-2">
          <Link 
            to="/admin/orders/export" 
            className="text-sm text-primary hover:underline"
          >
            Exportar
          </Link>
          <Link 
            to="/admin/orders/new" 
            className="text-sm text-primary hover:underline"
          >
            Novo Pedido
          </Link>
        </div>
      );
    }
    
    if (pathname.includes('/admin/products')) {
      return (
        <div className="flex space-x-2">
          <Link 
            to="/admin/products/categories" 
            className="text-sm text-primary hover:underline"
          >
            Categorias
          </Link>
          <Link 
            to="/admin/products/new" 
            className="text-sm text-primary hover:underline"
          >
            Novo Produto
          </Link>
        </div>
      );
    }
    
    return null;
  };

  return (
    <ActionBreadcrumb 
      actions={getContextualActions()}
      className="mb-6"
    />
  );
}