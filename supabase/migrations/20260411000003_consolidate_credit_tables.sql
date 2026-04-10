-- ═══════════════════════════════════════════════════════════
-- CONSOLIDATE CREDIT TABLES INTO USERS + PRODUCTS
-- Date: 2026-04-11
--
-- credit_balances → columns on users
-- auto_refill_settings → columns on users
-- service_credit_pricing → rows in products (type='credit_rate')
-- ═══════════════════════════════════════════════════════════

-- ─── ADD CREDIT COLUMNS TO USERS ────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS purchased_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_credits_expire_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_refill_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_refill_threshold INTEGER DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_refill_amount INTEGER DEFAULT 50;

-- ─── MIGRATE EXISTING DATA ─────────────────────────────────
UPDATE public.users u
SET subscription_credits = cb.subscription_credits,
    purchased_credits = cb.purchased_credits,
    subscription_credits_expire_at = cb.subscription_credits_expire_at
FROM public.credit_balances cb
WHERE u.id = cb.user_id;

UPDATE public.users u
SET auto_refill_enabled = ar.enabled,
    auto_refill_threshold = ar.threshold,
    auto_refill_amount = ar.refill_amount
FROM public.auto_refill_settings ar
WHERE u.id = ar.user_id;

-- ─── MIGRATE PRICING TO PRODUCTS ────────────────────────────
-- Add 'credit_rate' to products type constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check
  CHECK (type IN ('hosting_plan', 'domain_tld', 'plan_addon', 'one_time_service', 'credits', 'credit_rate'));

INSERT INTO public.products (type, name, slug, description, billing, price_cad, is_active, metadata)
SELECT 'credit_rate',
       scp.service_type || ' — ' || scp.metric,
       scp.service_type || '-' || scp.metric,
       scp.description,
       'monthly',
       0,
       scp.is_active,
       jsonb_build_object('service_type', scp.service_type, 'metric', scp.metric, 'credits_per_unit', scp.credits_per_unit)
FROM public.service_credit_pricing scp
ON CONFLICT (slug) DO UPDATE SET
    metadata = jsonb_build_object(
        'service_type', EXCLUDED.metadata->>'service_type',
        'metric', EXCLUDED.metadata->>'metric',
        'credits_per_unit', EXCLUDED.metadata->>'credits_per_unit'
    ),
    is_active = EXCLUDED.is_active;

-- ─── RECREATE POSTGRES FUNCTIONS ON USERS TABLE ─────────────

-- fn_deposit_credits — now operates on users table
CREATE OR REPLACE FUNCTION public.fn_deposit_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_pool TEXT,
    p_description TEXT DEFAULT NULL,
    p_service_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
BEGIN
    SELECT u.subscription_credits, u.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    IF p_pool = 'subscription' THEN
        v_sub_credits := v_sub_credits + p_amount;
        UPDATE public.users
        SET subscription_credits = v_sub_credits,
            subscription_credits_expire_at = COALESCE(p_expires_at, subscription_credits_expire_at)
        WHERE id = p_user_id;
    ELSE
        v_pur_credits := v_pur_credits + p_amount;
        UPDATE public.users
        SET purchased_credits = v_pur_credits
        WHERE id = p_user_id;
    END IF;

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

-- fn_deduct_credits — now operates on users table
CREATE OR REPLACE FUNCTION public.fn_deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_service_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_priority TEXT DEFAULT NULL
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
    v_deduct_from_sub INTEGER;
    v_deduct_from_pur INTEGER;
    v_use_sub_first BOOLEAN;
BEGIN
    SELECT u.subscription_credits, u.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    IF p_priority = 'subscription' THEN
        v_use_sub_first := TRUE;
    ELSIF p_priority = 'purchased' THEN
        v_use_sub_first := FALSE;
    ELSE
        v_use_sub_first := (p_service_type = 'wordpress');
    END IF;

    IF v_use_sub_first THEN
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

    UPDATE public.users
    SET subscription_credits = v_sub_credits,
        purchased_credits = v_pur_credits
    WHERE id = p_user_id;

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

-- fn_expire_subscription_credits — now operates on users table
CREATE OR REPLACE FUNCTION public.fn_expire_subscription_credits(
    p_user_id UUID
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
BEGIN
    SELECT u.subscription_credits, u.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    IF v_sub_credits > 0 THEN
        INSERT INTO public.credit_transactions (
            user_id, type, amount, subscription_balance_after, purchased_balance_after,
            description, service_type
        ) VALUES (
            p_user_id, 'expiry', -v_sub_credits, 0, v_pur_credits,
            'Monthly subscription credits expired', 'subscription'
        );
    END IF;

    UPDATE public.users
    SET subscription_credits = 0,
        subscription_credits_expire_at = NULL
    WHERE id = p_user_id;

    RETURN QUERY SELECT 0, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

-- ─── DROP OLD TABLES ────────────────────────────────────────
DROP TABLE IF EXISTS public.credit_balances;
DROP TABLE IF EXISTS public.auto_refill_settings;
DROP TABLE IF EXISTS public.service_credit_pricing;
