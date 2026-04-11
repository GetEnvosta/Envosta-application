-- ═══════════════════════════════════════════════════════════
-- DECOUPLE SITES FROM SUBSCRIPTIONS
-- Date: 2026-04-11
--
-- Sites no longer have their own subscription or product.
-- One subscription per account deposits credits.
-- Sites cost credits based on their config.
-- Domain renewals still use separate Stripe subscriptions.
-- ═══════════════════════════════════════════════════════════

-- Drop the foreign keys (columns stay for now as nullable, data preserved)
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_subscription_id_fkey;
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_product_id_fkey;

-- Make columns nullable and set to null
-- (keeping columns briefly so existing code doesn't crash on deploy,
--  but they're no longer used)
ALTER TABLE public.sites ALTER COLUMN subscription_id DROP NOT NULL;
ALTER TABLE public.sites ALTER COLUMN product_id DROP NOT NULL;
