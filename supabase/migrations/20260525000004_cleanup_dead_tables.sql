-- ═══════════════════════════════════════════════════════════════════════
-- CLEANUP DEAD TABLES — platform_settings + legacy logs
-- Date: 2026-05-25
--
-- 1. platform_settings — 0 callers, 0 rows, leftover from an early
--    feature that never landed. Drops the table + its updated_at
--    trigger function.
--
-- 2. logs — replaced by audit_log (state changes) + api_calls (outbound
--    API telemetry). All 22 writers migrated; all 5 readers repointed
--    to audit_log via a back-compat shape mapper. Loses 62 historical
--    rows of black-hole writes.
-- ═══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP FUNCTION IF EXISTS public.fn_platform_settings_updated() CASCADE;

DROP TABLE IF EXISTS public.logs CASCADE;

NOTIFY pgrst, 'reload schema';
