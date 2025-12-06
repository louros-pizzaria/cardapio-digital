-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expire-orders function to run every 5 minutes
SELECT cron.schedule(
  'expire-orders-every-5min',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://xpgsfovrxguphlvncgwn.supabase.co/functions/v1/expire-orders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZ3Nmb3ZyeGd1cGhsdm5jZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NDU5MjgsImV4cCI6MjA2NTAyMTkyOH0.oAeHjwZ-JzP3OG_WebpFXb5tP3n9K3IdfHY4e6DLaTE"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);