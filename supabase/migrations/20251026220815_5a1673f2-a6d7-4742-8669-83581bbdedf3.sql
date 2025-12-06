-- ===== FASE 1: INFRAESTRUTURA DE BANCO DE DADOS =====

-- 1. Marketing - Cupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC,
  max_discount_amount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para cupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons"
  ON public.coupons
  FOR ALL
  USING (has_role('admin'));

CREATE POLICY "Anyone can view active coupons"
  ON public.coupons
  FOR SELECT
  USING (is_active = true);

-- Índices para cupons
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX idx_coupons_valid ON public.coupons(valid_from, valid_until);

-- 2. Marketing - Promoções
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  target_product_ids UUID[],
  target_category_ids UUID[],
  min_quantity INTEGER,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para promoções
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promotions"
  ON public.promotions
  FOR ALL
  USING (has_role('admin'));

CREATE POLICY "Anyone can view active promotions"
  ON public.promotions
  FOR SELECT
  USING (is_active = true);

-- Índices para promoções
CREATE INDEX idx_promotions_active ON public.promotions(is_active) WHERE is_active = true;
CREATE INDEX idx_promotions_valid ON public.promotions(valid_from, valid_until);

-- 3. Marketing - Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  position TEXT DEFAULT 'home',
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banners"
  ON public.banners
  FOR ALL
  USING (has_role('admin'));

CREATE POLICY "Anyone can view active banners"
  ON public.banners
  FOR SELECT
  USING (is_active = true);

-- Índices para banners
CREATE INDEX idx_banners_position ON public.banners(position, order_position);
CREATE INDEX idx_banners_active ON public.banners(is_active) WHERE is_active = true;

-- 4. CRM - Segmentação
CREATE TABLE public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customer_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(segment_id, user_id)
);

-- RLS para segmentação
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer segments"
  ON public.customer_segments
  FOR ALL
  USING (has_role('admin'));

CREATE POLICY "Admins can manage segment members"
  ON public.customer_segment_members
  FOR ALL
  USING (has_role('admin'));

-- Índices para segmentação
CREATE INDEX idx_segment_members_segment ON public.customer_segment_members(segment_id);
CREATE INDEX idx_segment_members_user ON public.customer_segment_members(user_id);

-- 5. CRM - Campanhas de Comunicação
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,
  segment_id UUID REFERENCES public.customer_segments(id),
  template_id TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para campanhas
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing campaigns"
  ON public.marketing_campaigns
  FOR ALL
  USING (has_role('admin'));

-- Índices para campanhas
CREATE INDEX idx_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.marketing_campaigns(scheduled_at);

-- 6. CRM - Fidelidade
CREATE TABLE public.loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_orders INTEGER NOT NULL,
  benefits JSONB,
  color TEXT DEFAULT 'gray',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  tier_id UUID REFERENCES public.loyalty_tiers(id),
  lifetime_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.loyalty_rewards(id),
  points_used INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para fidelidade
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty tiers"
  ON public.loyalty_tiers
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage loyalty tiers"
  ON public.loyalty_tiers
  FOR ALL
  USING (has_role('admin'));

CREATE POLICY "Users can view their own points"
  ON public.loyalty_points
  FOR SELECT
  USING (auth.uid() = user_id OR has_role('admin'));

CREATE POLICY "System can manage loyalty points"
  ON public.loyalty_points
  FOR ALL
  USING (true);

CREATE POLICY "Anyone can view active rewards"
  ON public.loyalty_rewards
  FOR SELECT
  USING (is_active = true OR has_role('admin'));

CREATE POLICY "Admins can manage rewards"
  ON public.loyalty_rewards
  FOR ALL
  USING (has_role('admin'));

CREATE POLICY "Users can view their redemptions"
  ON public.loyalty_redemptions
  FOR SELECT
  USING (auth.uid() = user_id OR has_role('admin'));

CREATE POLICY "System can insert redemptions"
  ON public.loyalty_redemptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índices para fidelidade
CREATE INDEX idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX idx_loyalty_redemptions_user ON public.loyalty_redemptions(user_id);
CREATE INDEX idx_loyalty_rewards_active ON public.loyalty_rewards(is_active) WHERE is_active = true;

-- 7. Integrações - Delivery Platforms
CREATE TABLE public.delivery_platform_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  internal_order_id UUID REFERENCES public.orders(id),
  status TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  order_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, external_order_id)
);

-- RLS para delivery platforms
ALTER TABLE public.delivery_platform_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage delivery platform orders"
  ON public.delivery_platform_orders
  FOR ALL
  USING (has_role('admin'));

-- Índices para delivery platforms
CREATE INDEX idx_delivery_orders_platform ON public.delivery_platform_orders(platform);
CREATE INDEX idx_delivery_orders_internal ON public.delivery_platform_orders(internal_order_id);
CREATE INDEX idx_delivery_orders_sync ON public.delivery_platform_orders(sync_status);

-- 8. Popular dados iniciais - Loyalty Tiers
INSERT INTO public.loyalty_tiers (name, min_orders, benefits, color) VALUES
  ('Bronze', 0, '{"discount": 0, "free_delivery": false}'::jsonb, 'orange'),
  ('Prata', 5, '{"discount": 5, "free_delivery": false}'::jsonb, 'gray'),
  ('Ouro', 15, '{"discount": 10, "free_delivery": true}'::jsonb, 'yellow'),
  ('Platina', 30, '{"discount": 15, "free_delivery": true, "priority_support": true}'::jsonb, 'blue');

-- 9. Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_marketing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_coupons_timestamp
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();

CREATE TRIGGER update_promotions_timestamp
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();

CREATE TRIGGER update_banners_timestamp
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();

CREATE TRIGGER update_customer_segments_timestamp
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();

CREATE TRIGGER update_marketing_campaigns_timestamp
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();

CREATE TRIGGER update_loyalty_points_timestamp
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();

CREATE TRIGGER update_delivery_platform_orders_timestamp
  BEFORE UPDATE ON public.delivery_platform_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_timestamp();