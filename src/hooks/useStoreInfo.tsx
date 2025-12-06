import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

interface StoreInfo {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  phone: string;
  email: string;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
}

const storeInfoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional().nullable(),
  logo_url: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido').max(15, 'Telefone inválido'),
  email: z.string().email('Email inválido').max(100, 'Email muito longo'),
  address: z.string().max(200, 'Endereço muito longo').optional().nullable(),
  instagram: z.string().max(100, 'Instagram muito longo').optional().nullable(),
  facebook: z.string().max(100, 'Facebook muito longo').optional().nullable(),
  whatsapp: z.string().max(15, 'WhatsApp inválido').optional().nullable(),
});

export const useStoreInfo = () => {
  const queryClient = useQueryClient();

  const { data: storeInfo, isLoading, error } = useQuery({
    queryKey: ['store-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_info')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as StoreInfo;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<StoreInfo>) => {
      if (!storeInfo) throw new Error('Store info not loaded');

      // Validar dados
      try {
        storeInfoSchema.parse({ ...storeInfo, ...updates });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(validationError.errors[0].message);
        }
        throw validationError;
      }

      const { error } = await supabase
        .from('store_info')
        .update(updates)
        .eq('id', storeInfo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-info'] });
      toast.success('Informações salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return {
    storeInfo,
    isLoading,
    error,
    updateStoreInfo: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
