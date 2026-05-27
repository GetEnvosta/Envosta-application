-- ═══════════════════════════════════════════════════════════════════════
-- DROP DORMANT jobs + job_attempts
-- Date: 2026-05-26
--
-- These tables were built pre-Vercel-Workflows as a custom durable job
-- runner layer. After adopting Vercel Workflows (workflow npm package),
-- the workflow runtime checkpoints steps internally and exposes its own
-- observability via `npx workflow web`. The local tables never received
-- a single write — 0 rows, no producers.
--
-- Consumers removed in same commit:
--   - services/mirrors.ts: getJobStats() + getRecentJobs() — deleted
--   - /admin/audit page Jobs tab — deleted
-- ═══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.job_attempts CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;

NOTIFY pgrst, 'reload schema';
