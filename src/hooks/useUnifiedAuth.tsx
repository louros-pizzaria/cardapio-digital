// ===== HOOK DE AUTENTICAÇÃO UNIFICADO =====

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth as useAuthCore } from '@/hooks/auth/useAuth';
import { SecureStorage } from '@/utils/secureStorage';

interface UnifiedAuthContextType {
  // Auth State
  user: User | null;
  session: Session | null;
  loading: boolean;
  
  // Auth Actions
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  
  // Utility Functions
  isAuthenticated: () => boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const UnifiedAuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthCore();

  // ===== UTILITY FUNCTIONS =====
  const isAuthenticated = useCallback(() => {
    return !!auth.user && !!auth.session;
  }, [auth.user, auth.session]);

  const value: UnifiedAuthContextType = {
    user: auth.user,
    session: auth.session,
    loading: auth.loading,
    signUp: auth.signUp,
    signIn: auth.signIn,
    signOut: async () => {
      await SecureStorage.clearAll();
      await auth.signOut();
    },
    updateProfile: auth.updateProfile,
    isAuthenticated,
  };

  return <UnifiedAuthContext.Provider value={value}>{children}</UnifiedAuthContext.Provider>;
};

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within an UnifiedAuthProvider');
  }
  return context;
};

// Backward compatibility exports
export const useAuth = useUnifiedAuth;
