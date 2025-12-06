-- Migration: Enhance subscription sync system with idempotency and audit trails

-- Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL, -- Stripe event ID
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stripe_signature TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription audit logs table
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'reconciled'
  old_status TEXT,
  new_status TEXT,
  old_plan_name TEXT,
  new_plan_name TEXT,
  old_expires_at TIMESTAMP WITH TIME ZONE,
  new_expires_at TIMESTAMP WITH TIME ZONE,
  sync_source TEXT NOT NULL, -- 'webhook', 'manual', 'reconciliation'
  stripe_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add stripe_customer_id to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- Add new columns to subscriptions table for better tracking
DO $$ 
BEGIN
  -- Add current_period_start if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_start') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add current_period_end if not exists  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add cancel_at_period_end if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;
  END IF;
  
  -- Add canceled_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'canceled_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN canceled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add last_synced_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'last_synced_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  -- Add raw_metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'raw_metadata') THEN
    ALTER TABLE public.subscriptions ADD COLUMN raw_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_user_id ON public.subscription_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_created_at ON public.subscription_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_synced_at ON public.subscriptions(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);

-- Enable RLS on new tables
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_events (system only)
CREATE POLICY "System can manage webhook events" ON public.webhook_events FOR ALL USING (true);
CREATE POLICY "Admins can view webhook events" ON public.webhook_events FOR SELECT USING (has_role('admin'));

-- RLS policies for subscription_audit_logs
CREATE POLICY "Users can view their own audit logs" ON public.subscription_audit_logs 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert audit logs" ON public.subscription_audit_logs 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all audit logs" ON public.subscription_audit_logs 
  FOR SELECT USING (has_role('admin'));

-- Function to log subscription changes
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscription_audit_logs (
    user_id,
    action,
    old_status,
    new_status,
    old_plan_name,
    new_plan_name,
    old_expires_at,
    new_expires_at,
    sync_source,
    stripe_event_id,
    metadata
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    OLD.status,
    NEW.status,
    OLD.plan_name,
    NEW.plan_name,
    OLD.expires_at,
    NEW.expires_at,
    COALESCE(NEW.sync_status, 'unknown'),
    NEW.webhook_event_id,
    jsonb_build_object(
      'stripe_subscription_id', COALESCE(NEW.stripe_subscription_id, OLD.stripe_subscription_id),
      'stripe_price_id', COALESCE(NEW.stripe_price_id, OLD.stripe_price_id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription changes
DROP TRIGGER IF EXISTS subscription_audit_trigger ON public.subscriptions;
CREATE TRIGGER subscription_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

-- Function to check subscription with TTL cache
CREATE OR REPLACE FUNCTION public.check_subscription_cache(
  p_user_id UUID,
  p_ttl_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(
  is_active BOOLEAN,
  status TEXT,
  plan_name TEXT,
  plan_price NUMERIC,
  expires_at TIMESTAMP WITH TIME ZONE,
  needs_refresh BOOLEAN
) AS $$
DECLARE
  v_subscription RECORD;
  v_needs_refresh BOOLEAN := false;
BEGIN
  -- Get current subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id;
  
  -- Check if refresh is needed
  IF v_subscription IS NULL THEN
    v_needs_refresh := true;
  ELSIF v_subscription.last_synced_at < (now() - (p_ttl_minutes || ' minutes')::INTERVAL) THEN
    v_needs_refresh := true;
  ELSIF v_subscription.current_period_end < now() AND v_subscription.status = 'active' THEN
    v_needs_refresh := true;
  END IF;
  
  RETURN QUERY SELECT
    COALESCE(v_subscription.status = 'active', false),
    COALESCE(v_subscription.status, 'inactive'),
    COALESCE(v_subscription.plan_name, 'Nenhum'),
    COALESCE(v_subscription.plan_price, 0::numeric),
    v_subscription.expires_at,
    v_needs_refresh;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;