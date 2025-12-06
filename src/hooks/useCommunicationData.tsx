import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { applyStrategy } from '@/config/queryCacheMapping';
import { toast } from 'sonner';

export function useCommunicationData() {
  const queryClient = useQueryClient();

  // Buscar campanhas de marketing
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*, customer_segments(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    ...applyStrategy('campaigns'),
  });

  // Criar nova campanha
  const createCampaign = useMutation({
    mutationFn: async (campaignData: any) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([campaignData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar campanha');
    },
  });

  // Atualizar campanha
  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha atualizada!');
    },
  });

  // Deletar campanha
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha removida!');
    },
  });

  // Estatísticas
  const stats = {
    totalCampaigns: campaigns?.length || 0,
    sentCampaigns: campaigns?.filter(c => c.status === 'sent').length || 0,
    scheduledCampaigns: campaigns?.filter(c => c.status === 'scheduled').length || 0,
    totalRecipients: campaigns?.reduce((acc, c) => acc + (c.total_recipients || 0), 0) || 0,
    totalSent: campaigns?.reduce((acc, c) => acc + (c.sent_count || 0), 0) || 0,
    totalOpened: campaigns?.reduce((acc, c) => acc + (c.open_count || 0), 0) || 0,
    totalClicked: campaigns?.reduce((acc, c) => acc + (c.click_count || 0), 0) || 0,
    openRate: 0,
    clickRate: 0,
  };

  if (stats.totalSent > 0) {
    stats.openRate = Math.round((stats.totalOpened / stats.totalSent) * 100);
    stats.clickRate = Math.round((stats.totalClicked / stats.totalSent) * 100);
  }

  return {
    campaigns,
    loadingCampaigns,
    createCampaign: createCampaign.mutate,
    updateCampaign: updateCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
    stats,
  };
}
