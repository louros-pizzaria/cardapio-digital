-- Add mercadopago_payment_id field to pix_transactions table
ALTER TABLE public.pix_transactions 
ADD COLUMN mercadopago_payment_id text;

-- Add index for better performance on payment ID lookups
CREATE INDEX idx_pix_transactions_mercadopago_payment_id 
ON public.pix_transactions(mercadopago_payment_id);

-- Add comment to explain the field
COMMENT ON COLUMN public.pix_transactions.mercadopago_payment_id 
IS 'MercadoPago payment ID for real API status queries';