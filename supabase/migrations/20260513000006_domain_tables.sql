-- ═══════════════════════════════════════════════════════════════════════
-- DOMAIN TABLES (Phase 3)
-- Date: 2026-05-13
--
-- Domain pricing moves OUT of public.products into a dedicated public.tlds
-- table. No Stripe Products/Prices for TLDs anymore — checkouts use inline
-- price_data computed at charge time. Renewals become cron-fired one-time
-- charges, not recurring subs.
--
-- IMPORTANT: public.products.price_cad / price_usd are INTEGER cents (per
-- 20260424000001_seed_hosting_plans.sql — Minimum plan stored as 4900 =
-- $49.00). NO ×100 multiplier on backfill — values are copied directly.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tld TEXT NOT NULL UNIQUE,                          -- 'com', 'ca', 'net'
  display_name TEXT NOT NULL,                        -- '.com', '.ca'
  registry TEXT,                                     -- 'verisign', 'cira'
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_documentation BOOLEAN NOT NULL DEFAULT false,
  description TEXT,

  -- Pricing in cents. CAD primary (required), USD secondary (nullable).
  register_price_cad_cents INTEGER NOT NULL,
  renew_price_cad_cents INTEGER NOT NULL,
  transfer_price_cad_cents INTEGER,
  redemption_price_cad_cents INTEGER,

  register_price_usd_cents INTEGER,
  renew_price_usd_cents INTEGER,
  transfer_price_usd_cents INTEGER,
  redemption_price_usd_cents INTEGER,

  min_registration_years INTEGER NOT NULL DEFAULT 1,
  max_registration_years INTEGER NOT NULL DEFAULT 10,

  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlds_tld ON public.tlds(tld);
CREATE INDEX IF NOT EXISTS idx_tlds_is_active ON public.tlds(is_active);
ALTER TABLE public.tlds ENABLE ROW LEVEL SECURITY;

-- Marketing/pricing page reads this anonymously
DROP POLICY IF EXISTS "TLD catalog is publicly readable" ON public.tlds;
CREATE POLICY "TLD catalog is publicly readable"
  ON public.tlds FOR SELECT
  USING (is_active = true);

-- ───────────────────────────────────────────────────────────────────────
-- Backfill from public.products rows where type='domain_tld'.
--
-- Source pattern:
--   slug   = 'tld-com', 'tld-ca', etc.
--   name   = '.com' or 'Com Domain' (varies)
--   price_cad / price_usd are INTEGER CENTS (already).
--   metadata.tld may contain the bare 'com' (set by sync-stripe.ts).
--   metadata.registration_price_cad / metadata.transfer_price_cad have
--   been observed in the legacy admin edit page — opportunistically lift.
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO public.tlds (
  tld, display_name, registry,
  register_price_cad_cents, renew_price_cad_cents,
  transfer_price_cad_cents,
  register_price_usd_cents, renew_price_usd_cents,
  metadata
)
SELECT
  COALESCE(NULLIF((metadata->>'tld'), ''), REPLACE(slug, 'tld-', ''))  AS tld,
  COALESCE(NULLIF(name, ''), '.' || REPLACE(slug, 'tld-', ''))         AS display_name,
  NULLIF((metadata->>'registry'), '')                                  AS registry,
  COALESCE((metadata->>'registration_price_cad')::int, price_cad, 0)   AS register_price_cad_cents,
  COALESCE((metadata->>'renew_price_cad')::int, price_cad, 0)          AS renew_price_cad_cents,
  (metadata->>'transfer_price_cad')::int                               AS transfer_price_cad_cents,
  price_usd                                                            AS register_price_usd_cents,
  price_usd                                                            AS renew_price_usd_cents,
  COALESCE(metadata, '{}'::jsonb)                                      AS metadata
FROM public.products
WHERE type = 'domain_tld'
ON CONFLICT (tld) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────
-- Seed common TLDs. Backfill-first via ON CONFLICT (tld) DO NOTHING so we
-- don't trample customer prices the admin already tuned.
-- All amounts are CENTS (×100).
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO public.tlds (tld, display_name, registry, register_price_cad_cents, renew_price_cad_cents, register_price_usd_cents, renew_price_usd_cents)
VALUES
  ('com', '.com', 'verisign', 2000, 1800, 1500, 1400),
  ('ca',  '.ca',  'cira',     2500, 2200, 1900, 1700),
  ('net', '.net', 'verisign', 2200, 2000, 1700, 1500),
  ('org', '.org', 'pir',      2200, 2000, 1700, 1500),
  ('io',  '.io',  'identity', 6000, 6000, 4500, 4500),
  ('co',  '.co',  'gocoop',   3500, 3500, 2600, 2600),
  ('app', '.app', 'google',   2500, 2500, 1900, 1900),
  ('dev', '.dev', 'google',   2000, 2000, 1500, 1500)
ON CONFLICT (tld) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────
-- Drop the now-redundant domain_tld rows from public.products. Hosting
-- plans (type='hosting_plan'), plan_addon, and one_time_service stay.
-- ───────────────────────────────────────────────────────────────────────
DELETE FROM public.products WHERE type = 'domain_tld';

NOTIFY pgrst, 'reload schema';
