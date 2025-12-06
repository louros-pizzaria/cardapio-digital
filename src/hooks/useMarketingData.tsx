import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyStrategy } from '@/config/queryCacheMapping';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'free_delivery';
  discount_value: number;
  min_order_value: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  promotion_type: string;
  discount_type: string;
  discount_value: number;
  target_product_ids: string[] | null;
  target_category_ids: string[] | null;
  min_quantity: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  position: string;
  order_position: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

interface MarketingCampaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  segment_id: string | null;
  template_id: string | null;
  subject: string | null;
  message: string;
  scheduled_at: string | null;
  sent_at: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export function useMarketingData() {
  const queryClient = useQueryClient();

  // Coupons
  const { data: coupons, isLoading: loadingCoupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coupon[];
    },
    ...applyStrategy('coupons'),
  });

  const createCoupon = useMutation({
    mutationFn: async (coupon: any) => {
      const { data, error } = await supabase
        .from('coupons')
        .insert([coupon])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar cupom');
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom atualizado');
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom removido');
    },
  });

  // Promotions
  const { data: promotions, isLoading: loadingPromotions } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Promotion[];
    },
    ...applyStrategy('promotions'),
  });

  const createPromotion = useMutation({
    mutationFn: async (promotion: any) => {
      const { data, error } = await supabase
        .from('promotions')
        .insert([promotion])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção criada com sucesso');
    },
  });

  const updatePromotion = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção atualizada');
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção removida');
    },
  });

  // Banners
  const { data: banners, isLoading: loadingBanners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      return data as Banner[];
    },
    ...applyStrategy('banners'),
  });

  const createBanner = useMutation({
    mutationFn: async (banner: any) => {
      const { data, error } = await supabase
        .from('banners')
        .insert([banner])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner criado com sucesso');
    },
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('banners')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner atualizado');
    },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner removido');
    },
  });

  // Marketing Campaigns
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MarketingCampaign[];
    },
    ...applyStrategy('campaigns'),
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([campaign])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha criada com sucesso');
    },
  });

  // Stats
  const couponStats = {
    total: coupons?.length || 0,
    active: coupons?.filter(c => c.is_active).length || 0,
    totalUsed: coupons?.reduce((sum, c) => sum + c.used_count, 0) || 0,
    totalRevenue: coupons?.reduce((sum, c) => sum + (c.used_count * c.discount_value), 0) || 0,
  };

  const promotionStats = {
    total: promotions?.length || 0,
    active: promotions?.filter(p => p.is_active).length || 0,
  };

  const bannerStats = {
    total: banners?.length || 0,
    active: banners?.filter(b => b.is_active).length || 0,
    totalClicks: banners?.reduce((sum, b) => sum + b.click_count, 0) || 0,
  };

  const campaignStats = {
    total: campaigns?.length || 0,
    sent: campaigns?.filter(c => c.status === 'sent').length || 0,
    totalSent: campaigns?.reduce((sum, c) => sum + c.sent_count, 0) || 0,
    totalOpened: campaigns?.reduce((sum, c) => sum + c.open_count, 0) || 0,
    openRate: campaigns?.reduce((sum, c) => sum + c.sent_count, 0) 
      ? ((campaigns?.reduce((sum, c) => sum + c.open_count, 0) || 0) / (campaigns?.reduce((sum, c) => sum + c.sent_count, 0) || 1) * 100)
      : 0,
  };

  return {
    // Coupons
    coupons,
    loadingCoupons,
    createCoupon: createCoupon.mutate,
    updateCoupon: updateCoupon.mutate,
    deleteCoupon: deleteCoupon.mutate,
    couponStats,
    
    // Promotions
    promotions,
    loadingPromotions,
    createPromotion: createPromotion.mutate,
    updatePromotion: updatePromotion.mutate,
    deletePromotion: deletePromotion.mutate,
    promotionStats,
    
    // Banners
    banners,
    loadingBanners,
    createBanner: createBanner.mutate,
    updateBanner: updateBanner.mutate,
    deleteBanner: deleteBanner.mutate,
    bannerStats,
    
    // Campaigns
    campaigns,
    loadingCampaigns,
    createCampaign: createCampaign.mutate,
    campaignStats,
  };
}
