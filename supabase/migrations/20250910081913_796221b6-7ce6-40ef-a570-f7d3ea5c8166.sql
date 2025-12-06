-- Add price_id and webhook tracking to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN last_webhook_event TEXT,
ADD COLUMN webhook_event_id TEXT,
ADD COLUMN sync_status TEXT DEFAULT 'pending';

-- Create index for better performance on subscription queries
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_webhook_event ON public.subscriptions(webhook_event_id);

-- Update existing subscriptions to have sync_status as 'manual' since they were created without webhooks
UPDATE public.subscriptions SET sync_status = 'manual' WHERE sync_status = 'pending';