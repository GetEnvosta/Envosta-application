-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING — lock down SECURITY DEFINER function exposure
-- Date: 2026-05-25
--
-- Critical: anon could call get_integration_secret(uuid) via PostgREST
-- and read decrypted vault secrets. Lock down all dangerous functions
-- to service_role only. Keep fn_is_admin_or_staff callable by
-- authenticated (RLS policies depend on it).
--
-- Also: pin search_path on functions flagged by the linter, and
-- belt-and-suspenders REVOKE on stripe schema (already private but
-- prevents future accidental grants).
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Vault secret functions: service_role only ────────────────────
REVOKE EXECUTE ON FUNCTION public.store_integration_secret(text, text)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_integration_secret(uuid)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_integration_secret(uuid, text, text)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_integration_secret(uuid)               FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.store_integration_secret(text, text)         TO service_role;
GRANT EXECUTE ON FUNCTION public.get_integration_secret(uuid)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.update_integration_secret(uuid, text, text)   TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_integration_secret(uuid)               TO service_role;

-- ── 2. Trigger / event-trigger functions: never RPC-callable ────────
REVOKE EXECUTE ON FUNCTION public.handle_new_user()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- ── 3. Admin helper: anon must not call; authenticated can (RLS) ───
REVOKE EXECUTE ON FUNCTION public.is_admin()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_is_admin_or_staff() FROM PUBLIC, anon;
-- authenticated keeps EXECUTE — required by RLS policies that call this helper

-- ── 4. Pin search_path on public functions flagged by linter ────────
ALTER FUNCTION public.handle_new_user()              SET search_path = public, auth;
ALTER FUNCTION public.is_admin()                     SET search_path = public;
ALTER FUNCTION public.handle_updated_at()            SET search_path = public;
ALTER FUNCTION public.fn_platform_settings_updated() SET search_path = public;

-- ── 5. Belt-and-suspenders: prevent accidental future stripe grants ─
REVOKE ALL ON SCHEMA stripe                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA stripe        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA stripe     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA stripe     FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA stripe REVOKE ALL ON TABLES    FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA stripe REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA stripe REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
