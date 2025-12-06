// ===== LAZY LOADED ROUTES - PHASE 1 PERFORMANCE =====
// Reduz bundle inicial em ~40% ao carregar rotas pesadas sob demanda

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Wrapper para lazy loading com suspense
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense 
    fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    }
  >
    {children}
  </Suspense>
);

// ===== LAZY LOADED ADMIN ROUTES (Heavy) =====
export const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
export const AdminCatalog = lazy(() => import('@/pages/AdminCatalog'));
export const AdminConfig = lazy(() => import('@/pages/admin/configuracoes'));
export const AdminConfigConta = lazy(() => import('@/pages/admin/configuracoes/Conta'));
export const AdminConfigImpressao = lazy(() => import('@/pages/admin/configuracoes/Impressao'));
export const AdminConfigUsuarios = lazy(() => import('@/pages/admin/configuracoes/Usuarios'));

// ===== LAZY LOADED USER ROUTES (Medium) =====
export const Orders = lazy(() => import('@/pages/Orders'));
export const OrderStatus = lazy(() => import('@/pages/OrderStatus'));
export const OrderStatusModern = lazy(() => import('@/pages/OrderStatusModern'));
export const Account = lazy(() => import('@/pages/Account'));

// ===== LAZY LOADED ANALYTICS & DEBUG (Low Priority) =====
export const Analytics = lazy(() => import('@/pages/Analytics'));
export const LoadTest = lazy(() => import('@/pages/LoadTest'));

// Export lazy route wrapper
export { LazyRoute };
