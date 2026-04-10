-- ═══════════════════════════════════════════════════════════
-- ENVOSTA CREDIT SYSTEM — 6 NEW TABLES + 3 POSTGRES FUNCTIONS
-- Date: 2026-04-10
-- ═══════════════════════════════════════════════════════════

-- ─── Update products type constraint to include 'credits' ──
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check
  CHECK (type IN ('hosting_plan', 'domain_tld', 'plan_addon', 'one_time_service', 'credits'));

-- Add monthly credit cost column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS monthly_credit_cost INTEGER DEFAULT 0;

-- ─── CREDIT BALANCES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_balances (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_credits INTEGER NOT NULL DEFAULT 0,
    purchased_credits INTEGER NOT NULL DEFAULT 0,
    subscription_credits_expire_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── CREDIT TRANSACTIONS (immutable ledger) ─────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit_subscription', 'deposit_purchase', 'deduction', 'expiry', 'adjustment')),
    amount INTEGER NOT NULL,
    subscription_balance_after INTEGER NOT NULL DEFAULT 0,
    purchased_balance_after INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    service_type TEXT CHECK (service_type IN ('wordpress', 'ai_tokens', 'vapi', 'twilio', 'resend', 'manual', 'subscription', 'purchase')),
    reference_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SERVICE CREDIT PRICING ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_credit_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL,
    metric TEXT NOT NULL,
    credits_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(service_type, metric)
);

-- ─── AUTO-REFILL SETTINGS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auto_refill_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    threshold INTEGER NOT NULL DEFAULT 10,
    refill_amount INTEGER NOT NULL DEFAULT 50,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SITE GUARDRAILS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_guardrails (
    site_id UUID PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
    max_php_workers INTEGER,
    max_ssd_gb INTEGER,
    bursting_enabled BOOLEAN DEFAULT false,
    monthly_ai_token_limit INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AI USAGE LOG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    credits_charged NUMERIC(10,4) NOT NULL DEFAULT 0,
    model TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_service ON public.credit_transactions(service_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_site ON public.ai_usage_log(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_pricing_type ON public.service_credit_pricing(service_type);

-- ═══════════════════════════════════════════════════════════
-- POSTGRES FUNCTIONS (race-condition-safe balance operations)
-- ═══════════════════════════════════════════════════════════

-- ─── fn_deposit_credits ─────────────────────────────────────
-- Deposits credits into either subscription or purchased pool.
-- Returns the new balances.
CREATE OR REPLACE FUNCTION public.fn_deposit_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,           -- 'deposit_subscription' or 'deposit_purchase'
    p_pool TEXT,           -- 'subscription' or 'purchased'
    p_description TEXT DEFAULT NULL,
    p_service_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
BEGIN
    -- Ensure credit_balances row exists
    INSERT INTO public.credit_balances (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock the row for update
    SELECT cb.subscription_credits, cb.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.credit_balances cb
    WHERE cb.user_id = p_user_id
    FOR UPDATE;

    -- Update the appropriate pool
    IF p_pool = 'subscription' THEN
        v_sub_credits := v_sub_credits + p_amount;
        UPDATE public.credit_balances
        SET subscription_credits = v_sub_credits,
            subscription_credits_expire_at = COALESCE(p_expires_at, subscription_credits_expire_at),
            updated_at = now()
        WHERE credit_balances.user_id = p_user_id;
    ELSE
        v_pur_credits := v_pur_credits + p_amount;
        UPDATE public.credit_balances
        SET purchased_credits = v_pur_credits,
            updated_at = now()
        WHERE credit_balances.user_id = p_user_id;
    END IF;

    -- Insert transaction record
    INSERT INTO public.credit_transactions (
        user_id, type, amount, subscription_balance_after, purchased_balance_after,
        description, service_type, reference_id
    ) VALUES (
        p_user_id, p_type, p_amount, v_sub_credits, v_pur_credits,
        p_description, p_service_type, p_reference_id
    );

    RETURN QUERY SELECT v_sub_credits, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

-- ─── fn_deduct_credits ──────────────────────────────────────
-- Deducts credits with pool priority:
--   'subscription' (default for wordpress): subscription credits first, then purchased
--   'purchased' (default for everything else): purchased credits first, then subscription
-- This ensures the monthly 50 free credits go toward hosting first.
-- Allows negative balance on the fallback pool.
CREATE OR REPLACE FUNCTION public.fn_deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_service_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_priority TEXT DEFAULT NULL  -- 'subscription' or 'purchased'; NULL = auto by service_type
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
    v_deduct_from_sub INTEGER;
    v_deduct_from_pur INTEGER;
    v_use_sub_first BOOLEAN;
BEGIN
    -- Ensure credit_balances row exists
    INSERT INTO public.credit_balances (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock the row
    SELECT cb.subscription_credits, cb.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.credit_balances cb
    WHERE cb.user_id = p_user_id
    FOR UPDATE;

    -- Determine pool priority: wordpress always draws from subscription first,
    -- everything else draws from purchased first to preserve sub credits for hosting.
    IF p_priority = 'subscription' THEN
        v_use_sub_first := TRUE;
    ELSIF p_priority = 'purchased' THEN
        v_use_sub_first := FALSE;
    ELSE
        -- Auto: wordpress → subscription first, everything else → purchased first
        v_use_sub_first := (p_service_type = 'wordpress');
    END IF;

    IF v_use_sub_first THEN
        -- Subscription credits first, then purchased
        IF v_sub_credits >= p_amount THEN
            v_deduct_from_sub := p_amount;
            v_deduct_from_pur := 0;
        ELSIF v_sub_credits > 0 THEN
            v_deduct_from_sub := v_sub_credits;
            v_deduct_from_pur := p_amount - v_sub_credits;
        ELSE
            v_deduct_from_sub := 0;
            v_deduct_from_pur := p_amount;
        END IF;
    ELSE
        -- Purchased credits first, then subscription
        IF v_pur_credits >= p_amount THEN
            v_deduct_from_pur := p_amount;
            v_deduct_from_sub := 0;
        ELSIF v_pur_credits > 0 THEN
            v_deduct_from_pur := v_pur_credits;
            v_deduct_from_sub := p_amount - v_pur_credits;
        ELSE
            v_deduct_from_pur := 0;
            v_deduct_from_sub := p_amount;
        END IF;
    END IF;

    v_sub_credits := v_sub_credits - v_deduct_from_sub;
    v_pur_credits := v_pur_credits - v_deduct_from_pur;

    UPDATE public.credit_balances
    SET subscription_credits = v_sub_credits,
        purchased_credits = v_pur_credits,
        updated_at = now()
    WHERE credit_balances.user_id = p_user_id;

    -- Insert transaction record
    INSERT INTO public.credit_transactions (
        user_id, type, amount, subscription_balance_after, purchased_balance_after,
        description, service_type, reference_id
    ) VALUES (
        p_user_id, 'deduction', -p_amount, v_sub_credits, v_pur_credits,
        p_description, p_service_type, p_reference_id
    );

    RETURN QUERY SELECT v_sub_credits, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

-- ─── fn_expire_subscription_credits ─────────────────────────
-- Zeros out subscription credits and logs an expiry transaction.
CREATE OR REPLACE FUNCTION public.fn_expire_subscription_credits(
    p_user_id UUID
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
BEGIN
    -- Lock the row
    SELECT cb.subscription_credits, cb.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.credit_balances cb
    WHERE cb.user_id = p_user_id
    FOR UPDATE;

    -- Only log expiry if there are credits to expire
    IF v_sub_credits > 0 THEN
        INSERT INTO public.credit_transactions (
            user_id, type, amount, subscription_balance_after, purchased_balance_after,
            description, service_type
        ) VALUES (
            p_user_id, 'expiry', -v_sub_credits, 0, v_pur_credits,
            'Monthly subscription credits expired', 'subscription'
        );
    END IF;

    UPDATE public.credit_balances
    SET subscription_credits = 0,
        subscription_credits_expire_at = NULL,
        updated_at = now()
    WHERE credit_balances.user_id = p_user_id;

    RETURN QUERY SELECT 0, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════

-- Service credit pricing defaults
INSERT INTO public.service_credit_pricing (service_type, metric, credits_per_unit, description) VALUES
    ('wordpress', 'php_worker', 5.00, 'Credits per PHP worker per month'),
    ('wordpress', 'ssd_gb', 0.50, 'Credits per GB SSD storage per month'),
    ('wordpress', 'bursting', 10.00, 'Credits for bursting enabled per month'),
    -- Domains are billed as separate Stripe yearly subscriptions, not via credits.
    ('ai_tokens', 'per_1k_tokens', 0.50, 'Credits per 1,000 AI tokens used'),
    ('vapi', 'per_minute', 1.00, 'Credits per minute of Vapi voice call (placeholder)'),
    ('twilio', 'per_sms', 0.10, 'Credits per Twilio SMS sent (placeholder)'),
    ('resend', 'per_email', 0.05, 'Credits per email sent via Resend (placeholder)')
ON CONFLICT (service_type, metric) DO NOTHING;

-- Insert Credits product row
INSERT INTO public.products (type, name, slug, description, billing, price_cad, is_active, metadata)
VALUES (
    'credits',
    'Credits',
    'credits',
    'Purchase credits for Envosta services. 1 credit = $1 CAD.',
    'one_time',
    100,
    true,
    '{"unit_label": "credit", "unit_amount_cad": 100}'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed credit_balances for all existing users with active subscriptions
INSERT INTO public.credit_balances (user_id, subscription_credits, purchased_credits)
SELECT DISTINCT s.user_id, 50, 0
FROM public.subscriptions s
WHERE s.status IN ('active', 'trialing')
ON CONFLICT (user_id) DO NOTHING;
