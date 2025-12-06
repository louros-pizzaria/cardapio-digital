import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSettings {
  id: string;
  enabled: boolean;
  email_notifications: boolean;
  notification_email: string | null;
  in_app_notifications: boolean;
  min_attempts_threshold: number;
  time_window_minutes: number;
  notification_frequency: 'realtime' | 'hourly' | 'daily';
  last_notification_sent_at: string | null;
}

export const useNotificationSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as NotificationSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      if (!settings) throw new Error('Settings not loaded');

      const { error } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
