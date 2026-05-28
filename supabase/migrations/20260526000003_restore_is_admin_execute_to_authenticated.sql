-- ═══════════════════════════════════════════════════════════════════════
-- RESTORE EXECUTE on is_admin() to authenticated
-- Date: 2026-05-26
--
-- 20260525000002 revoked EXECUTE on public.is_admin() from authenticated
-- under the assumption that no code referenced it. That was wrong —
-- 7 RLS policies across users/blog_posts/products/sites/domains/tickets/
-- ticket_messages call is_admin() in their qual clause.
--
-- With EXECUTE revoked, those policies error out on evaluation, which
-- fails the entire query for any authenticated caller. The visible
-- symptom: getUserProfile() returned null → dashboard treated admin as
-- 'customer' → Staff Panel hidden in user dropdown.
--
-- Fix: grant EXECUTE back. The function is SECURITY DEFINER with pinned
-- search_path so calling it from authenticated is safe.
--
-- Long-term: the legacy *_admin_all / Admins-manage-* policies are
-- redundant with the newer fn_is_admin_or_staff()-based policies. They
-- should be consolidated, but that's a separate cleanup pass.
-- ═══════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

NOTIFY pgrst, 'reload schema';
