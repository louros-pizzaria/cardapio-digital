-- Create table for PIX transactions
CREATE TABLE public.pix_transactions (
  id text NOT NULL PRIMARY KEY,
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  br_code text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT pix_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for PIX transactions
CREATE POLICY "Users can view their own PIX transactions" 
ON public.pix_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PIX transactions" 
ON public.pix_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all PIX transactions" 
ON public.pix_transactions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pix_transactions_updated_at
BEFORE UPDATE ON public.pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_pix_transactions_order_id ON public.pix_transactions(order_id);
CREATE INDEX idx_pix_transactions_user_id ON public.pix_transactions(user_id);
CREATE INDEX idx_pix_transactions_status ON public.pix_transactions(status);
CREATE INDEX idx_pix_transactions_expires_at ON public.pix_transactions(expires_at);

-- Create function to update timestamp columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;