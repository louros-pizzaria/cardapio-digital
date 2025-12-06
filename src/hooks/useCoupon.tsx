import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabase';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_discount_amount?: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  usage_limit?: number;
  used_count: number;
}

export const useCoupon = (userId?: string) => {
  const { toast } = useToast();
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const validateCoupon = async (code: string): Promise<Coupon | null> => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      const coupon = data as any;

      // Validate dates
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (now < validFrom) {
        toast({
          title: "Cupom inválido",
          description: "Este cupom ainda não está ativo",
          variant: "destructive"
        });
        return null;
      }

      if (validUntil && now > validUntil) {
        toast({
          title: "Cupom expirado",
          description: "Este cupom já expirou",
          variant: "destructive"
        });
        return null;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        toast({
          title: "Cupom esgotado",
          description: "Este cupom atingiu o limite de uso",
          variant: "destructive"
        });
        return null;
      }

      return coupon;
    } catch (error) {
      console.error('Error validating coupon:', error);
      return null;
    }
  };

  const applyCoupon = async (code: string, orderValue: number) => {
    if (!code.trim()) {
      toast({
        title: "Código vazio",
        description: "Digite um código de cupom válido",
        variant: "destructive"
      });
      return false;
    }

    setIsApplying(true);

    try {
      const coupon = await validateCoupon(code);
      
      if (!coupon) {
        toast({
          title: "Cupom inválido",
          description: "Código não encontrado ou expirado",
          variant: "destructive"
        });
        return false;
      }

      // Check minimum order value
      if (coupon.min_order_value && orderValue < coupon.min_order_value) {
        toast({
          title: "Valor mínimo não atingido",
          description: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} para usar este cupom`,
          variant: "destructive"
        });
        return false;
      }

      setAppliedCoupon(coupon);
      toast({
        title: "Cupom aplicado!",
        description: `Desconto de ${
          coupon.discount_type === 'percent' 
            ? `${coupon.discount_value}%` 
            : `R$ ${coupon.discount_value.toFixed(2)}`
        } aplicado`,
      });
      return true;
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast({
        title: "Erro ao aplicar cupom",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({
      title: "Cupom removido",
      description: "O desconto foi removido do pedido"
    });
  };

  const calculateDiscount = (orderValue: number): number => {
    if (!appliedCoupon) return 0;

    let discount = 0;
    if (appliedCoupon.discount_type === 'percent') {
      discount = (orderValue * appliedCoupon.discount_value) / 100;
    } else {
      discount = appliedCoupon.discount_value;
    }

    // Apply max discount limit if exists
    if (appliedCoupon.max_discount_amount && discount > appliedCoupon.max_discount_amount) {
      discount = appliedCoupon.max_discount_amount;
    }

    return Math.min(discount, orderValue); // Discount can't be more than order value
  };

  const registerCouponUse = async (orderId: string) => {
    if (!appliedCoupon || !userId) return;

    try {
      // Insert coupon use record (types will be updated after migration)
      await supabase.from('coupon_uses' as any).insert({
        coupon_id: appliedCoupon.id,
        user_id: userId,
        order_id: orderId
      });

      // Increment coupon usage count (types will be updated after migration)
      await supabase.rpc('increment_coupon_usage' as any, {
        p_coupon_id: appliedCoupon.id
      });
    } catch (error) {
      console.error('Error registering coupon use:', error);
    }
  };

  return {
    appliedCoupon,
    isApplying,
    applyCoupon,
    removeCoupon,
    calculateDiscount,
    registerCouponUse
  };
};
