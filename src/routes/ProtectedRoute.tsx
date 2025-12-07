// ===== ROUTE GUARD ÚNICO E OTIMIZADO =====

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRole } from '@/hooks/useUnifiedProfile';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'customer' | 'admin' | 'attendant';
}

export const ProtectedRoute = ({
  children,
  requireAuth = false,
  requireRole,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, isAdmin, isAttendant, isCustomer, loading: roleLoading } = useRole();
  const location = useLocation();

  // ===== LOADING STATE =====
  const isLoading = authLoading || roleLoading;

  if (isLoading) {
    // Ocultar spinner visualmente para rotas de relatórios (que têm seu próprio LoaderOne)
    const isRelatoriosRoute = location.pathname.startsWith('/admin/relatorios');
    
    return (
      <div className={isRelatoriosRoute ? 'hidden' : "min-h-screen flex items-center justify-center"}>
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // ===== AUTH CHECK =====
  if (requireAuth && !user) {
    console.log('[ROUTE-GUARD] Redirecting to auth - no user');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // ===== REDIRECT AUTHENTICATED USERS FROM /auth =====
  if (!requireAuth && user && location.pathname === '/auth') {
    console.log('[ROUTE-GUARD] Redirecting authenticated user from /auth');
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isAttendant) return <Navigate to="/attendant" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // ===== ROLE CHECK =====
  if (user && requireRole && role) {
    if (requireRole === 'admin' && !isAdmin) {
      console.log('[ROUTE-GUARD] Access denied - not admin');
      if (isAttendant) return <Navigate to="/attendant" replace />;
      return <Navigate to="/dashboard" replace />;
    }

    if (requireRole === 'attendant' && !isAttendant) {
      console.log('[ROUTE-GUARD] Access denied - not attendant');
      if (isAdmin) return <Navigate to="/admin" replace />;
      return <Navigate to="/dashboard" replace />;
    }

    if (requireRole === 'customer' && !isCustomer) {
      console.log('[ROUTE-GUARD] Access denied - not customer');
      if (isAdmin) return <Navigate to="/admin" replace />;
      if (isAttendant) return <Navigate to="/attendant" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  // ===== ACCESS GRANTED =====
  return <>{children}</>;
};
