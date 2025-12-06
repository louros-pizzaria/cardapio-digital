-- Add customer_phone column to orders table
ALTER TABLE public.orders ADD COLUMN customer_phone text;

-- Add customer_name column to orders table for better order management
ALTER TABLE public.orders ADD COLUMN customer_name text;

-- Add delivery_method column to orders table
ALTER TABLE public.orders ADD COLUMN delivery_method text DEFAULT 'delivery';

-- Create index for better performance on customer_phone searches
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);

-- Create index for better performance on delivery_method
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON public.orders(delivery_method);