-- Create tables for Live Group Orders functionality

-- Table for group orders
CREATE TABLE public.group_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  total_amount NUMERIC DEFAULT 0,
  delivery_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 hours')
);

-- Table for group order participants
CREATE TABLE public.group_order_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_order_id UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'selecting',
  total NUMERIC DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for group order items
CREATE TABLE public.group_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_order_id UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  customizations JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for user preferences (Neural Personalization)
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  taste_profile TEXT[],
  dietary_restrictions TEXT[],
  preferred_flavors TEXT[],
  spice_level INTEGER DEFAULT 3,
  price_sensitivity TEXT DEFAULT 'medium',
  ordering_patterns JSONB DEFAULT '{}',
  mood_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_orders
CREATE POLICY "Users can view their group orders" ON public.group_orders
  FOR SELECT USING (
    host_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.group_order_participants 
      WHERE group_order_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create group orders" ON public.group_orders
  FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their group orders" ON public.group_orders
  FOR UPDATE USING (host_id = auth.uid());

-- RLS Policies for group_order_participants
CREATE POLICY "Users can view group participants" ON public.group_order_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_orders 
      WHERE id = group_order_id AND (
        host_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.group_order_participants gop
          WHERE gop.group_order_id = group_order_id AND gop.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can join groups" ON public.group_order_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for group_order_items
CREATE POLICY "Users can view group items" ON public.group_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_orders go
      WHERE go.id = group_order_id AND (
        go.host_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.group_order_participants gop
          WHERE gop.group_order_id = go.id AND gop.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can add their own items" ON public.group_order_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own items" ON public.group_order_items
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own items" ON public.group_order_items
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Enable realtime for group orders
ALTER publication supabase_realtime ADD TABLE public.group_orders;
ALTER publication supabase_realtime ADD TABLE public.group_order_participants;
ALTER publication supabase_realtime ADD TABLE public.group_order_items;