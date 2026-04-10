-- ═══════════════════════════════════════════════════════════
-- ADJUST CREDIT RATES — BASE SITE = 36 CREDITS
-- Date: 2026-04-11
--
-- Plan: $36 USD/mo = 36 credits
-- Base site: 2 workers × 8 + 25GB × 0.80 = 16 + 20 = 36 credits
-- Perfectly covered by the plan. Upgrades cost extra.
-- ═══════════════════════════════════════════════════════════

UPDATE public.products SET metadata = jsonb_set(metadata, '{credits_per_unit}', '"8"')
WHERE slug = 'wordpress-php_worker' AND type = 'credit_rate';

UPDATE public.products SET metadata = jsonb_set(metadata, '{credits_per_unit}', '"0.80"')
WHERE slug = 'wordpress-ssd_gb' AND type = 'credit_rate';

-- Bursting stays at 10 credits (upgrade feature)
-- AI tokens stay at 0.50 per 1k
-- Twilio stays at 2 cr/min + 2 cr/mo
