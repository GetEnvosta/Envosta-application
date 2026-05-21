-- ═══════════════════════════════════════════════════════════════════════
-- EXPAND MIRROR TABLES — production-grade wp.cloud + OpenSRS mirrors
-- Date: 2026-05-17
--
-- The original wpcloud_sites / opensrs_domains / opensrs_contacts tables
-- (from 20260513000002_phase1_essentials.sql) are thin placeholders — they
-- only ever receive a stub row from the provisioning routes. This migration
-- recreates them with research-backed first-class columns for every field
-- worth querying or alerting on, derived from:
--   - the wp.cloud Atomic API site object (get-site / create-site)
--   - the OpenSRS `get_domain` API (type=all_info + type=status)
--
-- The full raw upstream object is always kept in upstream_payload JSONB so
-- nothing is lost; the typed columns just make the hot fields indexable.
--
-- opensrs_contacts is RE-KEYED: a contact is a ROLE on a domain
-- (owner/admin/tech/billing), not a standalone resource. The key becomes
-- (domain_id, contact_type) rather than a synthetic upstream_id.
--
-- EPP auth code (domain_auth_info) is deliberately NOT mirrored — it's a
-- transfer secret and must be fetched on demand only.
--
-- DROP + recreate is safe: these tables hold only derived mirror state,
-- repopulated by the provisioning routes + reconciliation crons.
-- ═══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.opensrs_contacts CASCADE;
DROP TABLE IF EXISTS public.opensrs_domains CASCADE;
DROP TABLE IF EXISTS public.wpcloud_sites CASCADE;

-- ── wp.cloud site mirror ──────────────────────────────────────────────
CREATE TABLE public.wpcloud_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upstream_id TEXT NOT NULL UNIQUE,          -- atomic_site_id
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  wpcom_blog_id TEXT,
  primary_domain TEXT,
  upstream_status TEXT,
  php_version TEXT,
  geo_affinity TEXT,
  space_quota_gb INTEGER,
  space_used_mb BIGINT,
  php_memory_mb INTEGER,
  php_workers INTEGER,
  burst_enabled BOOLEAN,
  site_type TEXT,                            -- billable / staging / internal
  ip_address TEXT,
  ssl_status TEXT,
  ssl_expires_at TIMESTAMPTZ,
  clone_from TEXT,
  upstream_created_at TIMESTAMPTZ,
  upstream_payload JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wpcloud_sites_site_id ON public.wpcloud_sites(site_id);
CREATE INDEX idx_wpcloud_sites_status ON public.wpcloud_sites(upstream_status);
CREATE INDEX idx_wpcloud_sites_ssl_expires ON public.wpcloud_sites(ssl_expires_at);
CREATE INDEX idx_wpcloud_sites_last_synced ON public.wpcloud_sites(last_synced_at);
ALTER TABLE public.wpcloud_sites ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.wpcloud_sites IS 'Mirror of wp.cloud Atomic site state. Service-role only. Populated by provisioning + reconcile-wpcloud cron.';

-- ── OpenSRS domain mirror ─────────────────────────────────────────────
CREATE TABLE public.opensrs_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upstream_id TEXT NOT NULL UNIQUE,          -- domain name
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  upstream_status TEXT,
  lock_state BOOLEAN,
  whois_privacy TEXT,
  auto_renew BOOLEAN,
  let_expire BOOLEAN,
  expires_at TIMESTAMPTZ,
  registry_created_at TIMESTAMPTZ,
  registry_expires_at TIMESTAMPTZ,
  registry_updated_at TIMESTAMPTZ,
  registry_transferred_at TIMESTAMPTZ,
  transfer_away_in_progress BOOLEAN,
  sponsoring_rsp BOOLEAN,
  nameservers JSONB,                         -- nameserver_list array
  gdpr_consent_status TEXT,
  upstream_payload JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_opensrs_domains_domain_id ON public.opensrs_domains(domain_id);
CREATE INDEX idx_opensrs_domains_expires_at ON public.opensrs_domains(expires_at);
CREATE INDEX idx_opensrs_domains_status ON public.opensrs_domains(upstream_status);
CREATE INDEX idx_opensrs_domains_last_synced ON public.opensrs_domains(last_synced_at);
ALTER TABLE public.opensrs_domains ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.opensrs_domains IS 'Mirror of OpenSRS domain state. Service-role only. EPP auth code deliberately NOT mirrored (transfer secret — fetch on demand).';

-- ── OpenSRS contact mirror ────────────────────────────────────────────
-- Re-keyed: a contact is a ROLE on a domain (owner/admin/tech/billing),
-- not a standalone resource. Key is (domain_id, contact_type).
CREATE TABLE public.opensrs_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
  opensrs_domain_id UUID REFERENCES public.opensrs_domains(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('owner','admin','tech','billing')),
  first_name TEXT, last_name TEXT, org_name TEXT,
  address1 TEXT, address2 TEXT, address3 TEXT,
  city TEXT, state TEXT, postal_code TEXT, country TEXT,
  phone TEXT, fax TEXT, email TEXT,
  status TEXT,                               -- active / pending_current_registrant / pending_new_registrant
  gdpr_consent_status TEXT,
  upstream_payload JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_id, contact_type)
);
CREATE INDEX idx_opensrs_contacts_domain_id ON public.opensrs_contacts(domain_id);
CREATE INDEX idx_opensrs_contacts_last_synced ON public.opensrs_contacts(last_synced_at);
ALTER TABLE public.opensrs_contacts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.opensrs_contacts IS 'Mirror of OpenSRS per-domain contacts. Service-role only.';

NOTIFY pgrst, 'reload schema';
