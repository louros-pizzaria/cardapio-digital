-- Create cron job for order expiration
SELECT cron.schedule(
  'expire-orders-job',
  '*/10 * * * *', -- Every 10 minutes
  $$
  select
    net.http_post(
        url:='https://xpgsfovrxguphlvncgwn.supabase.co/functions/v1/expire-orders-enhanced',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZ3Nmb3ZyeGd1cGhsdm5jZ3duIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQ0NTkyOCwiZXhwIjoyMDY1MDIxOTI4fQ.qgwE7w8CyFU_wQo1fAe5qj7WKv06VRN4VKLg0gM6Xro"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Function to check order status health
CREATE OR REPLACE FUNCTION public.get_order_health_stats()
RETURNS TABLE(
  pending_orders bigint,
  expired_orders bigint,
  total_today bigint,
  avg_completion_time_minutes numeric,
  payment_failure_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending' AND payment_status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_orders,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as total_today,
    AVG(
      CASE WHEN status IN ('completed', 'delivered') 
      THEN EXTRACT(EPOCH FROM (updated_at - created_at))/60 
      END
    ) as avg_completion_time_minutes,
    (COUNT(*) FILTER (WHERE payment_status = 'failed') * 100.0 / NULLIF(COUNT(*), 0)) as payment_failure_rate
  FROM orders
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- Add index for better performance on order queries
CREATE INDEX IF NOT EXISTS idx_orders_status_payment_created 
ON orders(status, payment_status, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders(user_id, created_at DESC);