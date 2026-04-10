-- ═══════════════════════════════════════════════════════════
-- TWILIO AI RECEPTIONIST
-- Date: 2026-04-11
-- ═══════════════════════════════════════════════════════════

-- Add receptionist columns to sites
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS receptionist_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS receptionist_config JSONB DEFAULT '{}';

-- Unique partial index for fast lookup when calls arrive
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_twilio_phone
  ON public.sites(twilio_phone_number)
  WHERE twilio_phone_number IS NOT NULL;

-- Credit rate products for Twilio
INSERT INTO public.products (type, name, slug, description, billing, price_cad, is_active, metadata)
VALUES
  ('credit_rate', 'twilio_receptionist — per_minute', 'twilio_receptionist-per_minute',
   'Credits per minute of AI receptionist call', 'monthly', 0, true,
   '{"service_type": "twilio_receptionist", "metric": "per_minute", "credits_per_unit": 2}'),
  ('credit_rate', 'twilio_number — per_month', 'twilio_number-per_month',
   'Credits per phone number per month', 'monthly', 0, true,
   '{"service_type": "twilio_number", "metric": "per_month", "credits_per_unit": 2}')
ON CONFLICT (slug) DO NOTHING;
