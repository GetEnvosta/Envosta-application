-- Spending cap — customer-controlled maximum monthly bill
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS spending_cap INTEGER;

-- Update fn_record_usage to enforce spending cap
CREATE OR REPLACE FUNCTION public.fn_record_usage(
    p_user_id UUID,
    p_amount NUMERIC(10,2),
    p_service_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_usage NUMERIC(10,2);
    v_cap INTEGER;
BEGIN
    IF p_amount > 50 THEN
        RAISE EXCEPTION 'Usage of % credits exceeds maximum of 50 per operation', p_amount;
    END IF;

    SELECT u.usage_this_cycle, u.spending_cap INTO v_usage, v_cap
    FROM public.users u WHERE u.id = p_user_id FOR UPDATE;

    v_usage := COALESCE(v_usage, 0) + p_amount;

    -- Enforce spending cap (skip for infrastructure — that's checked at config time)
    IF v_cap IS NOT NULL AND v_usage > v_cap AND p_service_type NOT IN ('wordpress', 'twilio_number') THEN
        RAISE EXCEPTION 'Spending cap reached (% / % credits). Increase your cap in billing settings.', v_usage, v_cap;
    END IF;

    UPDATE public.users SET usage_this_cycle = v_usage WHERE id = p_user_id;

    INSERT INTO public.logs (user_id, action, details, level, metadata)
    VALUES (p_user_id, 'usage.recorded', p_description, 'info',
        jsonb_build_object('amount', p_amount, 'usage_this_cycle_after', v_usage,
            'service_type', p_service_type, 'reference_id', p_reference_id));

    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;
