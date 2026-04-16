-- Drop unused tables
--
-- These 8 tables have zero code references (no .from() calls in src/,
-- supabase/functions/, or cloud-run/) and are safe to remove:
--
--   Credit system leftovers (never wired up):
--     - ai_usage_log           — AI metering moved to logs + credit_transactions
--     - auto_refill_settings   — auto-refill feature never built
--     - service_credit_pricing — credit math hardcoded in provision-hosting
--
--   Affiliate/partner leftovers:
--     - referral_clicks         — click tracking moved to logs table
--     - partner_change_requests — partner change flow simplified
--
--   Integrations feature (never wired up):
--     - oauth_states           — OAuth state handled in cookies instead
--     - user_integrations      — no OAuth integrations UI ever built
--     - integration_providers  — seed data never used
--
-- Drop order matters: user_integrations -> integration_providers (FK),
-- so we use CASCADE to be safe.

BEGIN;

-- Credit system leftovers
DROP TABLE IF EXISTS public.ai_usage_log CASCADE;
DROP TABLE IF EXISTS public.auto_refill_settings CASCADE;
DROP TABLE IF EXISTS public.service_credit_pricing CASCADE;

-- Affiliate / partner leftovers
DROP TABLE IF EXISTS public.referral_clicks CASCADE;
DROP TABLE IF EXISTS public.partner_change_requests CASCADE;

-- Integrations feature (whole 20260413000001_integrations.sql migration)
DROP TABLE IF EXISTS public.oauth_states CASCADE;
DROP TABLE IF EXISTS public.user_integrations CASCADE;
DROP TABLE IF EXISTS public.integration_providers CASCADE;

COMMIT;
