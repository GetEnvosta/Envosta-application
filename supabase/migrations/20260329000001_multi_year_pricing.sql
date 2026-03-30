-- Add multi-year pricing columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_2yr_cad INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_3yr_cad INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id_2yr TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id_3yr TEXT;
