// ===== HOOK UNIFICADO DE PERFIL E ROLES =====

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  cpf?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

type UserRole = 'customer' | 'admin' | 'seller' | 'attendant';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const profileCache = new Map<string, { 
  profile: Profile; 
  role: UserRole;
  timestamp: number 
}>();

export const useUnifiedProfile = () => {
  const { user } = useUnifiedAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ CORREÇÃO: Remover debounce - role é crítica para roteamento imediato
  const currentUser = user;

  // Memoized role computations
  const roleInfo = useMemo(() => {
    if (!userRole) {
      return {
        role: null,
        isAdmin: false,
        isAttendant: false,
        isCustomer: false,
        isSeller: false,
        loading
      };
    }

    return {
      role: userRole,
      isAdmin: userRole === 'admin',
      isAttendant: userRole === 'attendant',
      isCustomer: userRole === 'customer',
      isSeller: userRole === 'seller',
      loading: false
    };
  }, [userRole, loading]);

  useEffect(() => {
    const fetchProfileAndRole = async () => {
      if (!currentUser?.id) {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
        profileCache.clear(); // Clear cache when no user
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // ✅ Limpar cache de outros usuários ao trocar de conta
        profileCache.forEach((value, key) => {
          if (key !== currentUser.id) {
            profileCache.delete(key);
          }
        });

        // Check cache first
        const cacheKey = currentUser.id;
        const cached = profileCache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < CACHE_TTL) {
          console.log('[PROFILE] 📦 Using cached data:', {
            userId: currentUser.id,
            profile: cached.profile.full_name,
            role: cached.role,
            cacheAge: Math.round((now - cached.timestamp) / 1000) + 's'
          });
          setProfile(cached.profile);
          setUserRole(cached.role);
          setLoading(false);
          return;
        }

        console.log('[PROFILE] Fetching profile and role for user:', currentUser.id);

        // Fetch profile (without role column)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError(profileError.message);
          setProfile(null);
          setUserRole(null);
          profileCache.delete(cacheKey);
        } else {
          // Fetch role from user_roles table (single source of truth)
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .order('role', { ascending: true })
            .limit(1)
            .maybeSingle();

          console.log('[PROFILE] 🎭 Role fetched:', {
            userId: currentUser.id,
            userEmail: currentUser.email,
            roleData,
            roleError: roleError?.message,
            finalRole: (roleData?.role as UserRole) || 'customer'
          });

          if (roleError) {
            console.error('Error fetching role:', roleError);
          }

          const role = (roleData?.role as UserRole) || 'customer';
          
          console.log('[PROFILE] 🎭 Fetched from database:', {
            userId: currentUser.id,
            profile: profileData.full_name,
            role: role,
            source: 'database'
          });
          
          setProfile(profileData);
          setUserRole(role);
          
          // Cache the result with role
          profileCache.set(cacheKey, { 
            profile: profileData, 
            role: role,
            timestamp: now 
          });
          
          // Clean old cache entries
          profileCache.forEach((value, key) => {
            if (key !== cacheKey && (now - value.timestamp) > CACHE_TTL) {
              profileCache.delete(key);
            }
          });
        }
      } catch (err: any) {
        console.error('Profile fetch error:', err);
        setError(err.message);
        setProfile(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndRole();
  }, [currentUser]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!currentUser?.id) throw new Error('Usuário não autenticado');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      
      // Update cache with current role
      profileCache.set(currentUser.id, { 
        profile: data, 
        role: userRole || 'customer',
        timestamp: Date.now() 
      });
      
      return data;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  // Clear cache on user change
  useEffect(() => {
    return () => {
      if (!currentUser) {
        profileCache.clear();
      }
    };
  }, [currentUser]);

  return {
    // Profile data
    profile,
    loading,
    error,
    updateProfile,
    hasRequiredData: !!(profile?.full_name && profile?.phone && profile?.cpf),
    isProfileComplete: !!(profile?.full_name && profile?.phone),
    
    // Role data (unified from useRole)
    ...roleInfo
  };
};

// Backward compatibility exports
export const useProfile = useUnifiedProfile;
export const useRole = useUnifiedProfile;