-- ═══════════════════════════════════════════════════════════
-- METERED BILLING — REPLACE CREDIT DEPOSITS WITH USAGE TRACKING
-- Date: 2026-04-12
--
-- Old model: deposit 36 credits, deduct from balance
-- New model: track usage, charge overage at cycle end
-- ═══════════════════════════════════════════════════════════

-- ─── ADD USAGE TRACKING COLUMNS ─────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS usage_this_cycle NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS included_credits INTEGER DEFAULT 36;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cycle_start TIMESTAMPTZ;

-- Seed cycle_start from active subscriptions
UPDATE public.users u
SET cycle_start = s.current_period_start
FROM public.subscriptions s
WHERE s.user_id = u.id AND s.status IN ('active', 'trialing')
AND u.cycle_start IS NULL;

-- ─── CREATE fn_record_usage ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_record_usage(
    p_user_id UUID,
    p_amount NUMERIC(10,2),
    p_service_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_usage NUMERIC(10,2);
BEGIN
    -- Guard: reject single operations over 50
    IF p_amount > 50 THEN
        RAISE EXCEPTION 'Usage of % credits exceeds maximum of 50 per operation', p_amount;
    END IF;

    -- Lock and increment
    SELECT u.usage_this_cycle INTO v_usage
    FROM public.users u WHERE u.id = p_user_id FOR UPDATE;

    v_usage := COALESCE(v_usage, 0) + p_amount;

    UPDATE public.users SET usage_this_cycle = v_usage WHERE id = p_user_id;

    -- Log
    INSERT INTO public.logs (user_id, action, details, level, metadata)
    VALUES (p_user_id, 'usage.recorded', p_description, 'info',
        jsonb_build_object(
            'amount', p_amount,
            'usage_this_cycle_after', v_usage,
            'service_type', p_service_type,
            'reference_id', p_reference_id
        ));

    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;

-- ─── COMPATIBILITY WRAPPER ──────────────────────────────────
-- fn_deduct_credits still called by edge functions during deploy.
-- Wraps fn_record_usage so nothing breaks.
CREATE OR REPLACE FUNCTION public.fn_deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_service_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_priority TEXT DEFAULT NULL
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_usage NUMERIC(10,2);
BEGIN
    -- Forward to fn_record_usage
    SELECT public.fn_record_usage(p_user_id, p_amount::NUMERIC(10,2), p_service_type, p_description, p_reference_id)
    INTO v_usage;

    -- Return dummy values for backward compat
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ─── DROP OLD DEPOSIT/EXPIRE FUNCTIONS ──────────────────────
DROP FUNCTION IF EXISTS public.fn_deposit_credits(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.fn_expire_subscription_credits(UUID);
