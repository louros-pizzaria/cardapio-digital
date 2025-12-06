-- Create RUM metrics table
CREATE TABLE IF NOT EXISTS public.rum_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('performance', 'error', 'interaction', 'business')),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  connection_type TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create error reports table
CREATE TABLE IF NOT EXISTS public.error_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  error_type TEXT NOT NULL CHECK (error_type IN ('javascript', 'network', 'performance', 'security')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rum_metrics_session_id ON public.rum_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_user_id ON public.rum_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_type_name ON public.rum_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_timestamp ON public.rum_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_error_reports_session_id ON public.error_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON public.error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_type ON public.error_reports(error_type);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON public.error_reports(severity);
CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp ON public.error_reports(timestamp);

-- Enable RLS
ALTER TABLE public.rum_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for RUM metrics
CREATE POLICY "Users can view their own metrics" 
ON public.rum_metrics 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR 
  has_any_role(ARRAY['admin', 'attendant'])
);

CREATE POLICY "Allow anonymous metric insertion" 
ON public.rum_metrics 
FOR INSERT 
WITH CHECK (true); -- Allow all inserts for monitoring

-- RLS Policies for error reports
CREATE POLICY "Users can view their own error reports" 
ON public.error_reports 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR 
  has_any_role(ARRAY['admin', 'attendant'])
);

CREATE POLICY "Allow anonymous error report insertion" 
ON public.error_reports 
FOR INSERT 
WITH CHECK (true); -- Allow all inserts for error tracking

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_metrics INTEGER := 0;
  deleted_errors INTEGER := 0;
BEGIN
  -- Delete RUM metrics older than 30 days
  DELETE FROM public.rum_metrics 
  WHERE created_at < now() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_metrics = ROW_COUNT;
  
  -- Delete error reports older than 90 days (keep longer for analysis)
  DELETE FROM public.error_reports 
  WHERE created_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_errors = ROW_COUNT;
  
  RETURN deleted_metrics + deleted_errors;
END;
$function$;