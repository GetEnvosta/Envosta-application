-- ═══════════════════════════════════════════════════════════════════════
-- DROP DEAD public.stripe_* TABLES + commissions
-- Date: 2026-05-17
--
-- The seven public.stripe_* tables were created by an early version of
-- the Phase 1 recovery script, back when the plan still called for
-- hand-rolled Stripe mirror tables. The plan was then revised: Supabase
-- Stripe Sync Engine owns all Stripe data in the dedicated `stripe`
-- schema (stripe.customers, stripe.subscriptions, …), and the final
-- Phase 1 migration (20260513000002) deliberately EXCLUDED these.
--
-- Result: public.stripe_* are orphans. Nothing reads or writes them —
-- application code queries the `stripe` schema via the Sync Engine.
-- Verified: zero `from('stripe_*')` references in src/.
--
-- `commissions` is a leftover from the removed partner program. The
-- 20260513000004 migration was meant to drop it; this re-drops it
-- idempotently in case that migration did not apply.
--
-- All drops are IF EXISTS + CASCADE — safe to run regardless of which
-- tables are actually present.
-- ═══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.stripe_subscription_items CASCADE;
DROP TABLE IF EXISTS public.stripe_subscriptions    CASCADE;
DROP TABLE IF EXISTS public.stripe_invoices         CASCADE;
DROP TABLE IF EXISTS public.stripe_payment_methods  CASCADE;
DROP TABLE IF EXISTS public.stripe_prices           CASCADE;
DROP TABLE IF EXISTS public.stripe_products         CASCADE;
DROP TABLE IF EXISTS public.stripe_customers        CASCADE;

DROP TABLE IF EXISTS public.commissions             CASCADE;

NOTIFY pgrst, 'reload schema';
