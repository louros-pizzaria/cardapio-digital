-- Fix RLS policies to prevent privilege escalation

-- Drop existing duplicate policies to clean up
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create single, secure policies for profiles table
CREATE POLICY "Users can view their profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their profile (except role)" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Create admin-only policy for role changes
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (public.get_current_user_role() = 'admin');

-- Clean up duplicate order policies
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create single, clear order policies
CREATE POLICY "Users can manage their orders" ON public.orders
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clean up duplicate order items policies
DROP POLICY IF EXISTS "Users can create order items for own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;

-- Create single, clear order items policies
CREATE POLICY "Users can manage their order items" ON public.order_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
));

-- Clean up duplicate subscription policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

-- Create single, clear subscription policies
CREATE POLICY "Users can manage their subscriptions" ON public.subscriptions
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);