import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyStrategy } from '@/config/queryCacheMapping';
import { toast } from 'sonner';

interface CustomerSegment {
  id: string;
  name: string;
  description: string | null;
  criteria: any;
  color: string;
  created_at: string;
  updated_at: string;
}

interface LoyaltyTier {
  id: string;
  name: string;
  min_orders: number;
  benefits: any;
  color: string;
  created_at: string;
}

interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  tier_id: string | null;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: any;
  is_active: boolean;
  created_at: string;
}

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export function useCRMData() {
  const queryClient = useQueryClient();

  // Customer Segments
  const { data: segments, isLoading: loadingSegments } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomerSegment[];
    },
    ...applyStrategy('customerSegments'),
  });

  const createSegment = useMutation({
    mutationFn: async (segment: any) => {
      const { data, error } = await supabase
        .from('customer_segments')
        .insert([segment])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      toast.success('Segmento criado com sucesso');
    },
  });

  // Loyalty Tiers
  const { data: loyaltyTiers, isLoading: loadingTiers } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('min_orders', { ascending: true });
      
      if (error) throw error;
      return data as LoyaltyTier[];
    },
    ...applyStrategy('loyaltyTiers'),
  });

  // Loyalty Rewards
  const { data: loyaltyRewards, isLoading: loadingRewards } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .order('points_cost', { ascending: true });
      
      if (error) throw error;
      return data as LoyaltyReward[];
    },
    ...applyStrategy('loyaltyRewards'),
  });

  const createReward = useMutation({
    mutationFn: async (reward: any) => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .insert([reward])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      toast.success('Recompensa criada com sucesso');
    },
  });

  // Customers with Loyalty Points
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers-with-loyalty'],
    queryFn: async () => {
      // First get all customer user_ids from user_roles
      const { data: customerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'customer');
      
      if (rolesError) throw rolesError;
      
      const customerIds = customerRoles?.map(r => r.user_id) || [];
      
      if (customerIds.length === 0) {
        return [];
      }
      
      // Then get profiles with loyalty points for those users
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          loyalty_points (
            points,
            lifetime_points,
            tier_id
          )
        `)
        .in('id', customerIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    ...applyStrategy('customers'),
  });

  // Recent Loyalty Activity (Redemptions)
  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ['loyalty-redemptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_redemptions')
        .select(`
          *,
          profiles (full_name, email),
          loyalty_rewards (name)
        `)
        .order('redeemed_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    ...applyStrategy('loyaltyRedemptions'),
  });

  // Stats
  const segmentStats = {
    total: segments?.length || 0,
  };

  const loyaltyStats = {
    totalMembers: customers?.filter(c => c.loyalty_points?.[0]?.points > 0).length || 0,
    totalPoints: customers?.reduce((sum, c) => sum + (c.loyalty_points?.[0]?.points || 0), 0) || 0,
    totalRewards: loyaltyRewards?.length || 0,
    activeRewards: loyaltyRewards?.filter(r => r.is_active).length || 0,
  };

  return {
    // Segments
    segments,
    loadingSegments,
    createSegment: createSegment.mutate,
    segmentStats,
    
    // Loyalty
    loyaltyTiers,
    loadingTiers,
    loyaltyRewards,
    loadingRewards,
    createReward: createReward.mutate,
    loyaltyStats,
    
    // Customers
    customers,
    loadingCustomers,
    
    // Activity
    recentActivity,
    loadingActivity,
  };
}
