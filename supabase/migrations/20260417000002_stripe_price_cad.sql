-- Add separate Stripe price ID columns for CAD currency
-- Allows syncing both USD and CAD prices to Stripe per product
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id_cad TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id_yearly_cad TEXT;
