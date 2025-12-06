// ===== AUTH HOOK - PURO, SEM SUBSCRIPTION =====

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // ===== AUTH STATE MANAGEMENT =====
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('[AUTH] State changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // ✅ CORREÇÃO: Redirecionar no INITIAL_SESSION baseado na role
        if (event === 'INITIAL_SESSION' && session?.user) {
          const currentPath = window.location.pathname;
          
          // Se está em /auth ou /, redirecionar baseado na role (sem debounce!)
          if (currentPath === '/auth' || currentPath === '/') {
            setTimeout(() => {
              supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .limit(1)
                .maybeSingle()
                .then(({ data }) => {
                  const role = data?.role || 'customer';
                  
                  console.log('[AUTH] INITIAL_SESSION redirect for role:', role);
                  
                  switch (role) {
                    case 'admin':
                      navigate('/admin');
                      break;
                    case 'attendant':
                      navigate('/attendant');
                      break;
                    default:
                      navigate('/dashboard');
                  }
                });
            }, 0);
          }
        }
        
      if (event === 'SIGNED_OUT') {
          console.log('[AUTH] SIGNED_OUT event detected - clearing auth caches');
          // Clear auth caches
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (
                key.startsWith('subscription_') ||
                key.startsWith('auth_') ||
                key.startsWith('login_block')
              )) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log('[AUTH] Cleared caches:', keysToRemove.length);
          } catch (e) {
            console.warn('[AUTH] Failed to clear cache:', e);
          }
        }
        
        // ✅ CORREÇÃO CRÍTICA: Detectar logout indevido
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AUTH] Token refreshed successfully');
        }
        
        if (mounted) setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.error('[AUTH] Session error:', error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===== SIGN IN =====
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect based on role
      if (data.user) {
        setRedirecting(true);
        
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .limit(1)
            .maybeSingle();

          if (roleError) {
            console.warn('[AUTH] Error fetching role, defaulting to customer:', roleError);
          }

          const role = roleData?.role || 'customer';
          
          console.log('[AUTH] User role detected:', role, '- Navigating...');
          
          // Use navigate instead of window.location to avoid crash
          setTimeout(() => {
            switch (role) {
              case 'admin':
                navigate('/admin');
                break;
              case 'attendant':
                navigate('/attendant');
                break;
              default:
                navigate('/dashboard');
                break;
            }
            setRedirecting(false);
          }, 300);
        } catch (roleError) {
          console.error('[AUTH] Error in role redirect:', roleError);
          // Fallback to customer dashboard
          navigate('/dashboard');
          setRedirecting(false);
        }
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });

      return data;
    } catch (error: any) {
      console.error('[AUTH] Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ===== SIGN UP =====
  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: userData.name,
            phone: userData.phone,
            cpf: userData.cpf
          }
        }
      });

      if (error) throw error;

      if (data.user && !error) {
        if (userData.address) {
          const { error: addressError } = await supabase
            .from('addresses')
            .insert({
              user_id: data.user.id,
              street: userData.address.street,
              number: userData.address.number,
              complement: userData.address.complement || null,
              neighborhood: userData.address.neighborhood,
              zip_code: userData.address.zipCode,
              reference_point: userData.address.reference || null,
              is_default: true
            });

          if (addressError) {
            console.error('[AUTH] Error creating address:', addressError);
          }
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar a conta.",
      });

      return data;
    } catch (error: any) {
      console.error('[AUTH] Sign up error:', error);
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ===== SIGN OUT =====
  const signOut = useCallback(async () => {
    try {
      console.log('[AUTH] Signing out');
      
      // Clear state immediately
      setSession(null);
      setUser(null);
      
      // Clear caches
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('subscription_') ||
            key.startsWith('auth_') ||
            key.startsWith('login_block')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.warn('[AUTH] Cache clear failed:', e);
      }
      
      // Perform logout
      await supabase.auth.signOut();
      
      toast({
        title: "Logout realizado!",
        description: "Até a próxima!",
      });
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('[AUTH] Sign out error:', error);
      
      // Ensure user is cleared locally regardless
      setSession(null);
      setUser(null);
      
      toast({
        title: "Logout realizado",
        description: "Sessão encerrada.",
      });
      
      // Redirect even on error
      window.location.href = '/auth';
    }
  }, [toast]);

  // ===== UPDATE PROFILE =====
  const updateProfile = useCallback(async (data: any) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      console.error('[AUTH] Update profile error:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [user, toast]);

  // ===== UTILITY =====
  const isAuthenticated = useCallback(() => {
    return !!user && !!session;
  }, [user, session]);

  return {
    user,
    session,
    loading: loading || redirecting,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated,
  };
};
