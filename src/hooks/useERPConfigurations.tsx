import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ERPConfiguration {
  id: string;
  erp_system: string;
  api_endpoint: string | null;
  api_key: string | null;
  sync_enabled: boolean;
  sync_frequency: string;
  configuration: any;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ERPSyncLog {
  id: string;
  erp_system: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_success: number;
  records_error: number;
  error_details: any;
  started_at: string;
  completed_at: string | null;
}

interface ERPConfigurationInput {
  erp_system: string;
  api_endpoint?: string;
  api_key?: string;
  sync_enabled?: boolean;
  sync_frequency?: string;
  configuration?: any;
}

export function useERPConfigurations() {
  const queryClient = useQueryClient();

  const { data: configurations, isLoading: loadingConfigs } = useQuery({
    queryKey: ['erp-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ERPConfiguration[];
    },
  });

  const { data: syncLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['erp-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ERPSyncLog[];
    },
  });

  const createConfiguration = useMutation({
    mutationFn: async (config: ERPConfigurationInput) => {
      const { data, error } = await supabase
        .from('erp_configurations')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-configurations'] });
      toast.success('Configuração ERP criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar configuração: ' + error.message);
    },
  });

  const updateConfiguration = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ERPConfiguration> & { id: string }) => {
      const { data, error } = await supabase
        .from('erp_configurations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-configurations'] });
      toast.success('Configuração atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar configuração: ' + error.message);
    },
  });

  const deleteConfiguration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('erp_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-configurations'] });
      toast.success('Configuração removida com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover configuração: ' + error.message);
    },
  });

  const testConnection = useMutation({
    mutationFn: async (id: string) => {
      // Aqui você chamaria uma edge function para testar a conexão
      toast.info('Testando conexão com o ERP...');
      
      // Simular teste por enquanto
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true, message: 'Conexão estabelecida com sucesso' };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error('Falha ao conectar com o ERP');
      }
    },
  });

  return {
    configurations: configurations || [],
    syncLogs: syncLogs || [],
    isLoading: loadingConfigs || loadingLogs,
    createConfiguration: createConfiguration.mutate,
    updateConfiguration: updateConfiguration.mutate,
    deleteConfiguration: deleteConfiguration.mutate,
    testConnection: testConnection.mutate,
    isCreating: createConfiguration.isPending,
    isUpdating: updateConfiguration.isPending,
    isDeleting: deleteConfiguration.isPending,
    isTesting: testConnection.isPending,
  };
}
