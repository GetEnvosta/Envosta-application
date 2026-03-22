-- ============================================================================
-- Update plans table with definitive spec columns + create domain_pricing
-- ============================================================================

-- Add missing columns to plans table
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_php_workers INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS default_php_workers INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS php_memory_mb INTEGER NOT NULL DEFAULT 512,
  ADD COLUMN IF NOT EXISTS onboarding_type TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS support_response_hours INTEGER NOT NULL DEFAULT 48;

-- Rename disk_gb to storage_gb if it exists as disk_gb
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'disk_gb') THEN
    ALTER TABLE public.plans RENAME COLUMN disk_gb TO storage_gb;
  END IF;
END $$;

-- Add storage_gb if it doesn't exist (in case disk_gb didn't exist either)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS storage_gb INTEGER NOT NULL DEFAULT 25;

-- ============================================================================
-- Update plan data to match definitive spec (CAD pricing)
-- ============================================================================
UPDATE public.plans SET
  price_monthly = 5000,
  storage_gb = 25,
  max_php_workers = 2,
  default_php_workers = 2,
  php_memory_mb = 512,
  has_staging = true,
  has_backups = true,
  has_cdn = true,
  has_waf = false,
  onboarding_type = 'standard',
  support_response_hours = 48,
  features = '["25 GB SSD Storage", "Staging Environment", "Free SSL Certificate", "Daily Backups", "Edge Cache + CDN", "Jetpack Security", "Consultation Call", "WordPress Installed", "Email Support (48hr)"]'::jsonb,
  sort_order = 1
WHERE slug = 'minimum';

UPDATE public.plans SET
  price_monthly = 12900,
  storage_gb = 50,
  max_php_workers = 4,
  default_php_workers = 2,
  php_memory_mb = 512,
  has_staging = true,
  has_backups = true,
  has_cdn = true,
  has_waf = false,
  onboarding_type = 'guided',
  support_response_hours = 24,
  features = '["50 GB SSD Storage", "Staging Environment", "Free SSL Certificate", "Daily Backups", "Edge Cache + CDN", "Jetpack Security", "Guided Onboarding", "Basic SEO Configured", "Priority Email Support (24hr)"]'::jsonb,
  sort_order = 2
WHERE slug = 'growth';

UPDATE public.plans SET
  price_monthly = 35000,
  storage_gb = 125,
  max_php_workers = 8,
  default_php_workers = 4,
  php_memory_mb = 512,
  has_staging = true,
  has_backups = true,
  has_cdn = true,
  has_waf = true,
  onboarding_type = 'concierge',
  support_response_hours = 4,
  features = '["125 GB SSD Storage", "Staging Environment", "Free SSL Certificate", "Daily Backups", "Edge Cache + CDN", "Jetpack Security", "Concierge Onboarding", "WooCommerce Setup", "Email DNS Configured", "Security Hardening", "Performance Optimization", "Dedicated Support (4hr)"]'::jsonb,
  sort_order = 3
WHERE slug = 'performance';

-- ============================================================================
-- Domain Pricing Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.domain_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tld TEXT UNIQUE NOT NULL,
    registration_price_cad INTEGER NOT NULL,
    renewal_price_cad INTEGER NOT NULL,
    transfer_price_cad INTEGER NOT NULL,
    stripe_product_id TEXT,                     -- Stripe Product for this TLD (e.g. "Domain: .com")
    stripe_price_id_yearly TEXT,                -- Stripe Price for yearly renewal subscription
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_domain_pricing ON public.domain_pricing;
CREATE TRIGGER set_updated_at_domain_pricing
  BEFORE UPDATE ON public.domain_pricing
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index on tld
CREATE INDEX IF NOT EXISTS idx_domain_pricing_tld ON public.domain_pricing(tld);

-- RLS
ALTER TABLE public.domain_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can read domain prices
CREATE POLICY domain_pricing_public_read ON public.domain_pricing
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can manage pricing
CREATE POLICY domain_pricing_admin_all ON public.domain_pricing
  FOR ALL TO authenticated USING (public.is_admin());

-- Grants
GRANT SELECT ON public.domain_pricing TO anon, authenticated;
GRANT ALL ON public.domain_pricing TO authenticated;

-- Seed domain pricing (CAD cents) — Top 20 TLDs for North America
-- NOTE: Prices are placeholders. Update with actual retail markup over OpenSRS wholesale.
INSERT INTO public.domain_pricing (tld, registration_price_cad, renewal_price_cad, transfer_price_cad) VALUES
  ('com',     1500, 1500, 1500),
  ('ca',      2000, 2000, 2000),
  ('net',     1500, 1500, 1500),
  ('org',     1500, 1500, 1500),
  ('co',      3500, 3500, 3500),
  ('io',      5000, 5000, 5000),
  ('dev',     2000, 2000, 2000),
  ('app',     2500, 2500, 2500),
  ('me',      2500, 2500, 2500),
  ('info',    1500, 1500, 1500),
  ('biz',     1500, 1500, 1500),
  ('us',      1500, 1500, 1500),
  ('store',   4000, 4000, 4000),
  ('online',  3500, 3500, 3500),
  ('tech',    4000, 4000, 4000),
  ('site',    3500, 3500, 3500),
  ('agency',  3000, 3000, 3000),
  ('shop',    3500, 3500, 3500),
  ('cloud',   2500, 2500, 2500),
  ('design',  4000, 4000, 4000)
ON CONFLICT (tld) DO UPDATE SET
  registration_price_cad = EXCLUDED.registration_price_cad,
  renewal_price_cad = EXCLUDED.renewal_price_cad,
  transfer_price_cad = EXCLUDED.transfer_price_cad;
