-- Add new columns to assets table for investment tracking
ALTER TABLE public.assets 
ADD COLUMN original_value NUMERIC,
ADD COLUMN original_unit TEXT,
ADD COLUMN asset_type TEXT DEFAULT 'physical',
ADD COLUMN symbol TEXT,
ADD COLUMN exchange_rate NUMERIC DEFAULT 1,
ADD COLUMN rate_last_updated TIMESTAMP WITH TIME ZONE;

-- Create function to update exchange rates
CREATE OR REPLACE FUNCTION public.update_asset_idr_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate IDR value when original_value or exchange_rate changes
  IF NEW.original_value IS NOT NULL AND NEW.exchange_rate IS NOT NULL THEN
    NEW.value = NEW.original_value * NEW.exchange_rate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update IDR value
CREATE TRIGGER update_asset_idr_value_trigger
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_asset_idr_value();

-- Create table for supported assets and their API endpoints
CREATE TABLE public.supported_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  api_endpoint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on supported_assets
ALTER TABLE public.supported_assets ENABLE ROW LEVEL SECURITY;

-- Create policy for supported_assets (public read)
CREATE POLICY "Anyone can view supported assets" 
ON public.supported_assets 
FOR SELECT 
USING (true);

-- Insert some common assets
INSERT INTO public.supported_assets (symbol, name, asset_type, api_endpoint) VALUES
('BTC', 'Bitcoin', 'crypto', 'bitcoin'),
('ETH', 'Ethereum', 'crypto', 'ethereum'),
('XAU', 'Gold', 'precious_metal', 'gold'),
('XAG', 'Silver', 'precious_metal', 'silver'),
('USD', 'US Dollar', 'currency', 'usd'),
('EUR', 'Euro', 'currency', 'eur'),
('JPY', 'Japanese Yen', 'currency', 'jpy'),
('BBCA', 'Bank Central Asia', 'stock', 'BBCA.JK'),
('BBRI', 'Bank Rakyat Indonesia', 'stock', 'BBRI.JK'),
('TLKM', 'Telkom Indonesia', 'stock', 'TLKM.JK');