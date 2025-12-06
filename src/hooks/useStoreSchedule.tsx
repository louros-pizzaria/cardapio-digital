import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateAllSchedules, isStoreOpenNow, getNextOpeningTime, DaySchedule } from '@/utils/scheduleValidation';

interface StoreScheduleData {
  autoSchedule: boolean;
  schedules: DaySchedule[];
  additionalInfo: string;
}

/**
 * Hook para gerenciar horários de funcionamento da loja
 */
export const useStoreSchedule = () => {
  const queryClient = useQueryClient();

  // Buscar horários do banco
  const { data, isLoading, error } = useQuery({
    queryKey: ['store-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('auto_schedule, schedules, additional_schedule_info')
        .limit(1)
        .single();

      if (error) throw error;

      return {
        autoSchedule: data.auto_schedule ?? true,
        schedules: (data.schedules as unknown as DaySchedule[]) ?? [],
        additionalInfo: data.additional_schedule_info ?? '',
      } as StoreScheduleData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Salvar horários
  const saveMutation = useMutation({
    mutationFn: async (scheduleData: StoreScheduleData) => {
      // Validar antes de salvar
      const validation = validateAllSchedules(scheduleData.schedules);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }

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
          auto_schedule: scheduleData.autoSchedule,
          schedules: scheduleData.schedules as any,
          additional_schedule_info: scheduleData.additionalInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSettings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-schedule'] });
      toast.success('Horários salvos com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Verificar se está aberto agora
  const checkIsOpen = () => {
    if (!data) return true;
    return isStoreOpenNow(data.schedules, data.autoSchedule);
  };

  // Obter próximo horário de abertura
  const getNextOpening = () => {
    if (!data) return null;
    return getNextOpeningTime(data.schedules);
  };

  return {
    scheduleData: data,
    isLoading,
    error,
    saveSchedule: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    isOpen: checkIsOpen(),
    nextOpening: getNextOpening(),
  };
};
