-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING — Phase 2
-- Date: 2026-05-25
--
-- 1. Lock is_admin() from authenticated — unused in code, was leaving an
--    authenticated SECURITY DEFINER warning.
-- 2. Add explicit RESTRICTIVE "deny non-service-role" policies on
--    service-role-only tables. RLS+no-policy already denies (and no
--    grants exist anyway), but explicit policies silence the linter and
--    document intent.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;

-- Service-role-only tables: explicit deny for anon + authenticated.
-- service_role bypasses RLS via BYPASSRLS so it continues to work.

DROP POLICY IF EXISTS "Service-role only" ON public.api_calls;
CREATE POLICY "Service-role only" ON public.api_calls AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.audit_log;
CREATE POLICY "Service-role only" ON public.audit_log AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.job_attempts;
CREATE POLICY "Service-role only" ON public.job_attempts AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.jobs;
CREATE POLICY "Service-role only" ON public.jobs AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.opensrs_contacts;
CREATE POLICY "Service-role only" ON public.opensrs_contacts AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.opensrs_domains;
CREATE POLICY "Service-role only" ON public.opensrs_domains AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.platform_settings;
CREATE POLICY "Service-role only" ON public.platform_settings AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.sync_drift;
CREATE POLICY "Service-role only" ON public.sync_drift AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.sync_runs;
CREATE POLICY "Service-role only" ON public.sync_runs AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.webhook_events;
CREATE POLICY "Service-role only" ON public.webhook_events AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service-role only" ON public.wpcloud_sites;
CREATE POLICY "Service-role only" ON public.wpcloud_sites AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
