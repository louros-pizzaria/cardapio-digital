-- Drop trigger first, then recreate function with security fix
DROP TRIGGER IF EXISTS update_pix_transactions_updated_at ON public.pix_transactions;

-- Fix security warning: Set search_path for function
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_pix_transactions_updated_at
BEFORE UPDATE ON public.pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();