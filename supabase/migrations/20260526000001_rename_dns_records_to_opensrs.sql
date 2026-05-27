-- ═══════════════════════════════════════════════════════════════════════
-- RENAME public.dns_records → public.opensrs_dns_records
-- Date: 2026-05-26
--
-- After the dns_records mirror upgrade (20260525000003), this table is
-- effectively an OpenSRS mirror — OpenSRS owns the zone, our table just
-- caches state with upstream_status / last_synced_at / source columns.
-- Rename for consistency with the other OpenSRS mirrors
-- (opensrs_domains, opensrs_contacts).
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.dns_records RENAME TO opensrs_dns_records;

-- Rename indexes
ALTER INDEX IF EXISTS public.dns_records_pkey                    RENAME TO opensrs_dns_records_pkey;
ALTER INDEX IF EXISTS public.idx_dns_records_domain_id           RENAME TO idx_opensrs_dns_records_domain_id;
ALTER INDEX IF EXISTS public.idx_dns_records_upstream_status     RENAME TO idx_opensrs_dns_records_upstream_status;
ALTER INDEX IF EXISTS public.idx_dns_records_last_synced         RENAME TO idx_opensrs_dns_records_last_synced;

-- Rename constraints
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.opensrs_dns_records'::regclass
      AND conname LIKE 'dns_records_%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.opensrs_dns_records RENAME CONSTRAINT %I TO %I',
      c.conname,
      regexp_replace(c.conname, '^dns_records_', 'opensrs_dns_records_')
    );
  END LOOP;
END $$;

-- Re-create the RLS policy under the new table name.
DROP POLICY IF EXISTS "Users can view DNS records for their own domains" ON public.opensrs_dns_records;
CREATE POLICY "Users can view DNS records for their own domains"
  ON public.opensrs_dns_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.domains d
      WHERE d.id = opensrs_dns_records.domain_id
        AND d.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.opensrs_dns_records IS
  'Per-domain DNS records. Customer-managed via UI (source=customer) and reconciled against OpenSRS zone via reconcile-opensrs cron (source=upstream). OpenSRS is the source of truth.';

NOTIFY pgrst, 'reload schema';
