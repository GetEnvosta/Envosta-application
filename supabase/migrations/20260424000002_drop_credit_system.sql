-- ═══════════════════════════════════════════════════════════
-- Drop the entire credit system: columns, functions, products,
-- type-check entries, and orphan tables. App-side code that
-- references these is removed in the same change.
-- ═══════════════════════════════════════════════════════════

-- ─── Functions ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_deposit_credits(UUID, INTEGER, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.fn_deposit_credits(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.fn_deposit_credits CASCADE;
DROP FUNCTION IF EXISTS public.fn_deduct_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.fn_deduct_credits CASCADE;
DROP FUNCTION IF EXISTS public.fn_record_usage(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.fn_record_usage CASCADE;
DROP FUNCTION IF EXISTS public.fn_expire_subscription_credits CASCADE;

-- ─── Drop user columns added by the credit system ──────
ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_credits;
ALTER TABLE public.users DROP COLUMN IF EXISTS purchased_credits;
ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_credits_expire_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS auto_refill_enabled;
ALTER TABLE public.users DROP COLUMN IF EXISTS auto_refill_threshold;
ALTER TABLE public.users DROP COLUMN IF EXISTS auto_refill_amount;
ALTER TABLE public.users DROP COLUMN IF EXISTS usage_this_cycle;
ALTER TABLE public.users DROP COLUMN IF EXISTS included_credits;
ALTER TABLE public.users DROP COLUMN IF EXISTS cycle_start;
ALTER TABLE public.users DROP COLUMN IF EXISTS mandatory_monthly_credits;
ALTER TABLE public.users DROP COLUMN IF EXISTS spending_cap;

-- ─── Drop product columns added by the credit system ───
ALTER TABLE public.products DROP COLUMN IF EXISTS monthly_credit_cost;

-- ─── Delete credit-system products (rates, packs) ──────
DELETE FROM public.products WHERE type IN ('credits', 'credit_rate');

-- ─── Restore products.type CHECK without 'credits'/'credit_rate' ──
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check
  CHECK (type IN ('hosting_plan', 'domain_tld', 'plan_addon', 'one_time_service'));

-- ─── Drop any orphan credit tables that may still exist ──
DROP TABLE IF EXISTS public.credit_balances CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.service_credit_pricing CASCADE;
DROP TABLE IF EXISTS public.auto_refill_settings CASCADE;
DROP TABLE IF EXISTS public.site_guardrails CASCADE;
DROP TABLE IF EXISTS public.ai_usage_log CASCADE;

-- ─── Strip credit log rows so the logs table stays meaningful ──
DELETE FROM public.logs WHERE action LIKE 'credit.%' OR action = 'ai.usage';

-- ─── Drop site columns added for AI metering / receptionist credit billing ──
-- (These were added alongside the credit system; the receptionist feature itself can return later as a flat addon.)
ALTER TABLE public.sites DROP COLUMN IF EXISTS monthly_ai_token_limit;
