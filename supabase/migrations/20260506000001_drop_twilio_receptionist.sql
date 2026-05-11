-- ═══════════════════════════════════════════════════════════
-- DROP TWILIO RECEPTIONIST
-- Date: 2026-05-06
--
-- The internal AI receptionist (Twilio ConversationRelay → Cloud Run
-- → Claude → TTS) has been removed from the app. This migration drops
-- all the schema artifacts the feature left behind so the database
-- matches the application code.
--
-- Affected objects:
--   - public.phone_numbers           (entire table)
--   - public.sites.twilio_phone_number, receptionist_enabled, receptionist_config
--   - idx_sites_twilio_phone
--   - platform_settings rows where key = 'envosta_phone'
--   - products rows for the twilio credit_rate items
--   - logs rows with action = 'receptionist.call' (audit trail — kept by default,
--     uncomment the DELETE at the bottom if you want them gone too)
-- ═══════════════════════════════════════════════════════════

-- Drop the dedicated phone_numbers table (also drops its indexes + RLS policies)
DROP TABLE IF EXISTS public.phone_numbers CASCADE;

-- Drop the index that was created against the now-removed sites column
DROP INDEX IF EXISTS public.idx_sites_twilio_phone;

-- Drop the Twilio columns on sites
ALTER TABLE public.sites DROP COLUMN IF EXISTS twilio_phone_number;
ALTER TABLE public.sites DROP COLUMN IF EXISTS receptionist_enabled;
ALTER TABLE public.sites DROP COLUMN IF EXISTS receptionist_config;

-- Remove Twilio-related platform_settings row(s)
DELETE FROM public.platform_settings WHERE key = 'envosta_phone';

-- Remove the Twilio credit_rate product rows
DELETE FROM public.products
WHERE type = 'credit_rate'
  AND slug IN ('twilio_receptionist-per_minute', 'twilio_number-per_month');

-- Audit logs — KEPT by default. Uncomment to also delete the historical call records:
-- DELETE FROM public.logs WHERE action = 'receptionist.call';
