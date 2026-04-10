-- ═══════════════════════════════════════════════════════════
-- CREDIT DEDUCTION SAFETY GUARDS
-- Date: 2026-04-11
--
-- 1. Max single deduction: 50 credits (rejects anything higher)
-- 2. Daily spend tracking via logs for admin alerting
-- ═══════════════════════════════════════════════════════════

-- Recreate fn_deduct_credits with 50-credit max guard
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
    -- GUARD: reject single deductions over 50 credits
    IF p_amount > 50 THEN
        RAISE EXCEPTION 'Deduction of % credits exceeds maximum of 50 per operation', p_amount;
    END IF;

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
