import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductSettings {
  id: string;
  stock_control_enabled: boolean;
  auto_disable_out_of_stock: boolean;
  low_stock_threshold: number;
  show_old_price_on_sale: boolean;
}

export const useProductSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['product-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as ProductSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ProductSettings>) => {
      if (!settings) throw new Error('Settings not loaded');

      // Validações
      if (updates.low_stock_threshold !== undefined && updates.low_stock_threshold < 0) {
        throw new Error('Alerta de estoque não pode ser negativo');
      }

      const { error } = await supabase
        .from('product_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-settings'] });
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
