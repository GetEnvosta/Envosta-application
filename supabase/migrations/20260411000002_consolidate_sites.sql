-- ═══════════════════════════════════════════════════════════
-- CONSOLIDATE SITE GUARDRAILS INTO SITES TABLE
-- Date: 2026-04-11
-- Addons are now credit-metered via site config, not separate subscriptions.
-- Guardrails move directly onto the sites table.
-- ═══════════════════════════════════════════════════════════

-- Add guardrail columns directly to sites
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS max_php_workers INTEGER;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS max_ssd_gb INTEGER;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS bursting_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS monthly_ai_token_limit INTEGER;

-- Migrate existing guardrails data into sites
UPDATE public.sites s
SET max_php_workers = g.max_php_workers,
    max_ssd_gb = g.max_ssd_gb,
    bursting_enabled = g.bursting_enabled,
    monthly_ai_token_limit = g.monthly_ai_token_limit
FROM public.site_guardrails g
WHERE s.id = g.site_id;

-- Drop the standalone tables
DROP TABLE IF EXISTS public.site_guardrails;
DROP TABLE IF EXISTS public.site_addons;
