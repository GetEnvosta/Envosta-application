-- ═══════════════════════════════════════════════════════════
-- MANDATORY MONTHLY CREDITS TRACKING
-- Date: 2026-04-11
--
-- Tracks the user's total mandatory monthly infrastructure cost.
-- Updated whenever site config changes (workers, SSD, bursting, phone).
-- The base plan deposits 50 credits — mandatory is deducted first,
-- remainder is variable usage headroom.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mandatory_monthly_credits NUMERIC(10,2) DEFAULT 0;

-- Seed from current site configs
UPDATE public.users u
SET mandatory_monthly_credits = COALESCE((
  SELECT SUM(
    COALESCE((s.config->>'php_workers')::int, 2) * 5 +
    COALESCE((s.config->>'storage_gb')::int, 25) * 0.5 +
    CASE WHEN s.bursting_enabled THEN 10 ELSE 0 END +
    CASE WHEN s.twilio_phone_number IS NOT NULL THEN 2 ELSE 0 END
  )
  FROM public.sites s
  WHERE s.user_id = u.id AND s.status IN ('active', 'provisioning')
), 0);
