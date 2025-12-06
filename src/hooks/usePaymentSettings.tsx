import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentSettings {
  online: {
    pix: boolean;
    creditCard: boolean;
    creditFee: number;
    debitCard: boolean;
    debitFee: number;
  };
  inPerson: {
    cash: boolean;
    changeFor: number;
    deliveryFee: number;
    freeDeliveryAbove: number;
  };
  general: {
    minOrder: number;
    maxOrder: number;
    autoDiscount: boolean;
    discountThreshold: number;
    discountPercent: number;
    allowCoupons: boolean;
    requireLogin: boolean;
  };
}

export const usePaymentSettings = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('online_payment_config, in_person_payment_config, general_payment_config')
        .limit(1)
        .single();

      if (error) throw error;

      return {
        online: data.online_payment_config,
        inPerson: data.in_person_payment_config,
        general: data.general_payment_config,
      } as PaymentSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: PaymentSettings) => {
      // Buscar o ID da configuração existente
      const { data: existingSettings } = await supabase
        .from('store_settings')
        .select('id')
        .limit(1)
        .single();

      if (!existingSettings) {
        throw new Error('Configurações da loja não encontradas');
      }

      const { error } = await supabase
        .from('store_settings')
        .update({
          online_payment_config: settings.online,
          in_person_payment_config: settings.inPerson,
          general_payment_config: settings.general,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSettings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast.success('Configurações de pagamento salvas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return {
    settings: data,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
};
