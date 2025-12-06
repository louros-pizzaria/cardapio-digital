// ===== SISTEMA DE PRELOAD INTELIGENTE DE ROTAS =====

import { lazy } from 'react';

// Cache de componentes já carregados
const componentCache = new Map();

// Função para preload de componentes de forma inteligente
export const preloadRoute = async (routePath: string) => {
  if (componentCache.has(routePath)) {
    return componentCache.get(routePath);
  }

  try {
    let component;
    
    switch (routePath) {
      case '/menu':
        component = await import('../pages/Menu');
        break;
      case '/orders':
        component = await import('../pages/Orders');
        break;
      case '/account':
        component = await import('../pages/Account');
        break;
      case '/dashboard':
        component = await import('../pages/Dashboard');
        break;
      case '/checkout':
        component = await import('../pages/Checkout');
        break;
      default:
        return null;
    }

    componentCache.set(routePath, component);
    console.log(`⚡ Preloaded route: ${routePath}`);
    return component;
  } catch (error) {
    console.warn(`Failed to preload route: ${routePath}`, error);
    return null;
  }
};

// Preload baseado no comportamento do usuário
export const smartPreload = {
  // Preload ao hover em links (300ms antes do clique)
  onHover: (routePath: string) => {
    setTimeout(() => preloadRoute(routePath), 150);
  },

  // Preload de rotas críticas no idle time
  preloadCritical: () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Preload das rotas mais acessadas
        const criticalRoutes = ['/menu', '/checkout', '/orders'];
        criticalRoutes.forEach(route => {
          setTimeout(() => preloadRoute(route), Math.random() * 1000);
        });
      });
    }
  },

  // Preload sequencial baseado na jornada do usuário
  userJourney: (currentRoute: string) => {
    const journeyMap = {
      '/menu': ['/checkout'],
      '/checkout': ['/payment'],
      '/dashboard': ['/menu', '/orders'],
    };

    const nextRoutes = journeyMap[currentRoute as keyof typeof journeyMap];
    if (nextRoutes) {
      nextRoutes.forEach((route, index) => {
        setTimeout(() => preloadRoute(route), index * 500);
      });
    }
  }
};

// Hook para uso em componentes
export const useRoutePreloader = () => {
  return {
    preload: preloadRoute,
    smart: smartPreload,
  };
};