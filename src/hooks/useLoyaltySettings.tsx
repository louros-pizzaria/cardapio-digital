import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LoyaltySettings {
  id: string;
  enabled: boolean;
  points_per_real: number;
  min_purchase: number;
  points_to_discount: number;
  max_discount_percent: number;
  birthday_bonus: number;
  first_purchase_bonus: number;
}

export const useLoyaltySettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as LoyaltySettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<LoyaltySettings>) => {
      if (!settings) throw new Error('Settings not loaded');

      // Validações básicas
      if (updates.points_per_real !== undefined && updates.points_per_real < 0) {
        throw new Error('Pontos por real não pode ser negativo');
      }
      if (updates.min_purchase !== undefined && updates.min_purchase < 0) {
        throw new Error('Compra mínima não pode ser negativa');
      }
      if (updates.points_to_discount !== undefined && updates.points_to_discount <= 0) {
        throw new Error('Pontos para desconto deve ser maior que zero');
      }
      if (updates.max_discount_percent !== undefined && 
          (updates.max_discount_percent < 0 || updates.max_discount_percent > 100)) {
        throw new Error('Desconto máximo deve estar entre 0 e 100%');
      }

      const { error } = await supabase
        .from('loyalty_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
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
