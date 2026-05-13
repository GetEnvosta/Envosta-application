-- ═══════════════════════════════════════════════════════════════════════
-- STRIPE SYNC ENGINE CUTOVER
-- Date: 2026-05-13
--
-- The Supabase Stripe Sync Engine continuously mirrors all Stripe data
-- into the `stripe` schema (stripe.customers, stripe.subscriptions,
-- stripe.subscription_items, stripe.invoices, stripe.payment_methods,
-- stripe.products, stripe.prices, …). With that in place, the local
-- public.subscriptions and public.invoices tables are pure duplication
-- — every Stripe write came in via the webhook and was mirrored locally
-- AND mirrored to stripe.* by the Sync Engine. Drop the local copies.
--
-- Account-centric model (NEW):
--   - One subscription per user. Looked up via
--     users.stripe_customer_id → stripe.subscriptions WHERE customer = X
--   - Sites belong to a user via user_id. No per-site subscription FK.
--   - sites.subscription_id column is removed entirely. Callers look up
--     the active sub through the user.
--
-- Safe to drop because:
--   1. Sync Engine has been running and stripe.* schema is populated.
--   2. The webhook (post-this-commit) writes ONLY to webhook_events for
--      dedup + side effects; it no longer maintains public.subscriptions
--      or public.invoices.
--   3. sites.subscription_id FK was already dropped on 2026-04-11
--      (migration 20260411000014) — only the column remained.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- STEP 1 — Drop sites.subscription_id (column + any stale FK)
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_subscription_id_fkey;
ALTER TABLE public.sites DROP COLUMN IF EXISTS subscription_id;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 2 — Drop the redundant local mirror tables
-- Sync Engine owns the truth in stripe.subscriptions and stripe.invoices.
-- CASCADE so any leftover indexes / dependent objects go with them.
-- ───────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 3 — Force PostgREST to refresh its schema cache
-- ───────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
