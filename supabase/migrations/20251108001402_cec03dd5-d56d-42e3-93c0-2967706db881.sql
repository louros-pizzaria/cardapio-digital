-- ===================================
-- STORE INFO TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS public.store_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Minha Loja',
  description text,
  logo_url text,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text,
  instagram text,
  facebook text,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_info ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view store info"
  ON public.store_info FOR SELECT
  USING (true);

CREATE POLICY "Admins can update store info"
  ON public.store_info FOR UPDATE
  USING (has_role('admin'));

CREATE POLICY "Admins can insert store info"
  ON public.store_info FOR INSERT
  WITH CHECK (has_role('admin'));

-- Insert default row
INSERT INTO public.store_info (name, phone, email)
VALUES ('Minha Loja', '', '')
ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_store_info_updated_at
  BEFORE UPDATE ON public.store_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================
-- LOYALTY SETTINGS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  points_per_real numeric(10,2) NOT NULL DEFAULT 1.0,
  min_purchase numeric(10,2) NOT NULL DEFAULT 15.0,
  points_to_discount integer NOT NULL DEFAULT 100,
  max_discount_percent integer NOT NULL DEFAULT 50,
  birthday_bonus integer NOT NULL DEFAULT 100,
  first_purchase_bonus integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_points_per_real CHECK (points_per_real >= 0),
  CONSTRAINT valid_min_purchase CHECK (min_purchase >= 0),
  CONSTRAINT valid_points_to_discount CHECK (points_to_discount > 0),
  CONSTRAINT valid_max_discount CHECK (max_discount_percent >= 0 AND max_discount_percent <= 100),
  CONSTRAINT valid_birthday_bonus CHECK (birthday_bonus >= 0),
  CONSTRAINT valid_first_purchase_bonus CHECK (first_purchase_bonus >= 0)
);

-- Enable RLS
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view loyalty settings"
  ON public.loyalty_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update loyalty settings"
  ON public.loyalty_settings FOR UPDATE
  USING (has_role('admin'));

CREATE POLICY "Admins can insert loyalty settings"
  ON public.loyalty_settings FOR INSERT
  WITH CHECK (has_role('admin'));

-- Insert default row
INSERT INTO public.loyalty_settings (enabled)
VALUES (false)
ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON public.loyalty_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================
-- PRODUCT SETTINGS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS public.product_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_control_enabled boolean NOT NULL DEFAULT false,
  auto_disable_out_of_stock boolean NOT NULL DEFAULT false,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  show_old_price_on_sale boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_low_stock_threshold CHECK (low_stock_threshold >= 0)
);

-- Enable RLS
ALTER TABLE public.product_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view product settings"
  ON public.product_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update product settings"
  ON public.product_settings FOR UPDATE
  USING (has_role('admin'));

CREATE POLICY "Admins can insert product settings"
  ON public.product_settings FOR INSERT
  WITH CHECK (has_role('admin'));

-- Insert default row
INSERT INTO public.product_settings (stock_control_enabled)
VALUES (false)
ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_product_settings_updated_at
  BEFORE UPDATE ON public.product_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();