import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface StoreClosedAttempt {
  id: string;
  user_id: string | null;
  attempted_at: string;
  user_email: string | null;
  user_name: string | null;
  user_phone: string | null;
  cart_value: number | null;
  cart_items_count: number | null;
  source: string;
  page_url: string | null;
  next_opening: string | null;
  created_at: string;
}

interface AttemptsStats {
  total_attempts: number;
  unique_users: number;
  total_lost_revenue: number;
  avg_cart_value: number;
  most_common_hour: number;
  attempts_by_hour: Record<string, number>;
}

export const useStoreClosedAttempts = (startDate?: string, endDate?: string) => {
  const {
    data: attempts,
    isLoading: isLoadingAttempts,
    error: attemptsError,
  } = useQuery({
    queryKey: ['store-closed-attempts', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('store_closed_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(100);

      if (startDate) {
        query = query.gte('attempted_at', startDate);
      }
      if (endDate) {
        query = query.lte('attempted_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StoreClosedAttempt[];
    },
    staleTime: 1000 * 60, // 1 minuto
  });

  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ['store-closed-stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_closed_attempts_stats', {
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString(),
      });

      if (error) throw error;
      return data[0] as AttemptsStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Verificar e enviar notificação automática
  useEffect(() => {
    const checkAndSendNotification = async () => {
      if (!stats) return;

      try {
        // Chamar edge function para processar notificação
        const { error } = await supabase.functions.invoke('send-notification-email', {
          body: {
            attemptsCount: stats.total_attempts,
            timeWindow: '60 minutos',
            totalRevenue: stats.total_lost_revenue,
            uniqueUsers: stats.unique_users,
          }
        });

        if (error) {
          console.error('[STORE_CLOSED_ATTEMPTS] Error sending notification:', error);
        }
      } catch (error) {
        console.error('[STORE_CLOSED_ATTEMPTS] Error invoking notification function:', error);
      }
    };

    // Verificar a cada vez que as stats são atualizadas
    if (stats && stats.total_attempts > 0) {
      checkAndSendNotification();
    }
  }, [stats]);

  return {
    attempts,
    stats,
    isLoading: isLoadingAttempts || isLoadingStats,
    error: attemptsError || statsError,
  };
};
