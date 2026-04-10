-- ═══════════════════════════════════════════════════════════
-- CONSOLIDATE credit_transactions + ai_usage_log INTO logs
-- Date: 2026-04-11
-- ═══════════════════════════════════════════════════════════

-- ─── MIGRATE CREDIT TRANSACTIONS TO LOGS ────────────────────
INSERT INTO public.logs (user_id, action, details, level, metadata, created_at)
SELECT
    ct.user_id,
    'credit.' || ct.type,
    ct.description,
    'info',
    jsonb_build_object(
        'amount', ct.amount,
        'subscription_balance_after', ct.subscription_balance_after,
        'purchased_balance_after', ct.purchased_balance_after,
        'service_type', ct.service_type,
        'reference_id', ct.reference_id,
        'source', 'credit_transaction'
    ) || COALESCE(ct.metadata, '{}'),
    ct.created_at
FROM public.credit_transactions ct;

-- ─── MIGRATE AI USAGE LOGS ─────────────────────────────────
INSERT INTO public.logs (user_id, site_id, action, details, level, metadata, created_at)
SELECT
    al.user_id,
    al.site_id,
    'ai.usage',
    al.action || ': ' || al.total_tokens || ' tokens',
    'info',
    jsonb_build_object(
        'ai_action', al.action,
        'input_tokens', al.input_tokens,
        'output_tokens', al.output_tokens,
        'total_tokens', al.total_tokens,
        'credits_charged', al.credits_charged,
        'model', al.model,
        'source', 'ai_usage_log'
    ) || COALESCE(al.metadata, '{}'),
    al.created_at
FROM public.ai_usage_log al;

-- ─── UPDATE POSTGRES FUNCTIONS TO USE LOGS ──────────────────

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
    FROM public.users u WHERE u.id = p_user_id FOR UPDATE;

    IF p_pool = 'subscription' THEN
        v_sub_credits := v_sub_credits + p_amount;
        UPDATE public.users SET subscription_credits = v_sub_credits,
            subscription_credits_expire_at = COALESCE(p_expires_at, subscription_credits_expire_at)
        WHERE id = p_user_id;
    ELSE
        v_pur_credits := v_pur_credits + p_amount;
        UPDATE public.users SET purchased_credits = v_pur_credits WHERE id = p_user_id;
    END IF;

    INSERT INTO public.logs (user_id, action, details, level, metadata)
    VALUES (p_user_id, 'credit.' || p_type, p_description, 'info',
        jsonb_build_object('amount', p_amount, 'subscription_balance_after', v_sub_credits,
            'purchased_balance_after', v_pur_credits, 'service_type', p_service_type,
            'reference_id', p_reference_id));

    RETURN QUERY SELECT v_sub_credits, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

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
    FROM public.users u WHERE u.id = p_user_id FOR UPDATE;

    IF p_priority = 'subscription' THEN v_use_sub_first := TRUE;
    ELSIF p_priority = 'purchased' THEN v_use_sub_first := FALSE;
    ELSE v_use_sub_first := (p_service_type = 'wordpress');
    END IF;

    IF v_use_sub_first THEN
        IF v_sub_credits >= p_amount THEN v_deduct_from_sub := p_amount; v_deduct_from_pur := 0;
        ELSIF v_sub_credits > 0 THEN v_deduct_from_sub := v_sub_credits; v_deduct_from_pur := p_amount - v_sub_credits;
        ELSE v_deduct_from_sub := 0; v_deduct_from_pur := p_amount;
        END IF;
    ELSE
        IF v_pur_credits >= p_amount THEN v_deduct_from_pur := p_amount; v_deduct_from_sub := 0;
        ELSIF v_pur_credits > 0 THEN v_deduct_from_pur := v_pur_credits; v_deduct_from_sub := p_amount - v_pur_credits;
        ELSE v_deduct_from_pur := 0; v_deduct_from_sub := p_amount;
        END IF;
    END IF;

    v_sub_credits := v_sub_credits - v_deduct_from_sub;
    v_pur_credits := v_pur_credits - v_deduct_from_pur;

    UPDATE public.users SET subscription_credits = v_sub_credits, purchased_credits = v_pur_credits
    WHERE id = p_user_id;

    INSERT INTO public.logs (user_id, action, details, level, metadata)
    VALUES (p_user_id, 'credit.deduction', p_description, 'info',
        jsonb_build_object('amount', -p_amount, 'subscription_balance_after', v_sub_credits,
            'purchased_balance_after', v_pur_credits, 'service_type', p_service_type,
            'reference_id', p_reference_id));

    RETURN QUERY SELECT v_sub_credits, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_expire_subscription_credits(
    p_user_id UUID
) RETURNS TABLE(subscription_credits INTEGER, purchased_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_pur_credits INTEGER;
BEGIN
    SELECT u.subscription_credits, u.purchased_credits
    INTO v_sub_credits, v_pur_credits
    FROM public.users u WHERE u.id = p_user_id FOR UPDATE;

    IF v_sub_credits > 0 THEN
        INSERT INTO public.logs (user_id, action, details, level, metadata)
        VALUES (p_user_id, 'credit.expiry', 'Monthly subscription credits expired', 'info',
            jsonb_build_object('amount', -v_sub_credits, 'subscription_balance_after', 0,
                'purchased_balance_after', v_pur_credits, 'service_type', 'subscription'));
    END IF;

    UPDATE public.users SET subscription_credits = 0, subscription_credits_expire_at = NULL
    WHERE id = p_user_id;

    RETURN QUERY SELECT 0, v_pur_credits;
END;
$$ LANGUAGE plpgsql;

-- ─── DROP OLD TABLES ────────────────────────────────────────
DROP TABLE IF EXISTS public.credit_transactions;
DROP TABLE IF EXISTS public.ai_usage_log;
