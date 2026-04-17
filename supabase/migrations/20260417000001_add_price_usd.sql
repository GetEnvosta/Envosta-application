-- Add USD price columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_usd INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_yearly_usd INTEGER;
