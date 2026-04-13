-- ============================================================
-- Integration Providers catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.integration_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(100) UNIQUE NOT NULL,
  display_name  VARCHAR(200) NOT NULL,
  category      VARCHAR(50),                        -- 'calendar', 'crm', 'email', etc.
  auth_type     VARCHAR(20) NOT NULL DEFAULT 'oauth2',
  scopes        TEXT[],                             -- default requested scopes
  logo_url      TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed providers
INSERT INTO public.integration_providers (id, slug, display_name, category, auth_type, scopes, description)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'google_calendar',
  'Google Calendar',
  'calendar',
  'oauth2',
  ARRAY[
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ],
  'Let your AI receptionist check your availability and book appointments directly into your calendar.'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- User Integrations — one row per connected account per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id           UUID NOT NULL REFERENCES public.integration_providers(id),
  label                 TEXT,                       -- "Work Calendar", "Personal"
  provider_account_id   TEXT,                       -- Google sub / external user ID
  provider_email        TEXT,                       -- which account they connected
  credentials_vault_id  UUID,                       -- FK into vault.secrets
  expires_at            TIMESTAMPTZ,                -- access token expiry (unencrypted for scheduling)
  scopes_granted        TEXT[],                     -- what was actually granted
  connection_config     JSONB DEFAULT '{}',         -- calendar IDs, selected calendar, etc.
  status                TEXT DEFAULT 'active'
                          CHECK (status IN ('active', 'needs_reauth', 'revoked', 'paused')),
  last_used_at          TIMESTAMPTZ,
  last_error_code       TEXT,
  last_error_at         TIMESTAMPTZ,
  refresh_attempts      INT DEFAULT 0,
  refresh_exhausted     BOOLEAN DEFAULT false,
  enabled               BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  -- Same user cannot connect the same provider account twice
  UNIQUE (user_id, provider_id, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user     ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status   ON public.user_integrations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_integrations_expires  ON public.user_integrations(expires_at) WHERE status = 'active';

-- ============================================================
-- OAuth States — CSRF protection, TTL ~10 minutes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state       TEXT UNIQUE NOT NULL,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.integration_providers(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state      ON public.oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires    ON public.oauth_states(expires_at);

-- ============================================================
-- Vault helper functions (SECURITY DEFINER so service role can call via RPC)
-- ============================================================

-- Store a secret in Vault, return the vault UUID
CREATE OR REPLACE FUNCTION public.store_integration_secret(
  p_secret TEXT,
  p_name   TEXT
) RETURNS UUID
SECURITY DEFINER
SET search_path = vault, public
LANGUAGE SQL AS $$
  SELECT vault.create_secret(p_secret, p_name, 'Envosta integration token');
$$;

-- Read a secret from Vault by UUID
CREATE OR REPLACE FUNCTION public.get_integration_secret(
  p_id UUID
) RETURNS TEXT
SECURITY DEFINER
SET search_path = vault, public
LANGUAGE SQL AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = p_id;
$$;

-- Update a secret in Vault (used on token refresh)
CREATE OR REPLACE FUNCTION public.update_integration_secret(
  p_id     UUID,
  p_secret TEXT,
  p_name   TEXT
) RETURNS VOID
SECURITY DEFINER
SET search_path = vault, public
LANGUAGE SQL AS $$
  SELECT vault.update_secret(p_id, p_secret, p_name, 'Envosta integration token');
$$;

-- Delete a secret from Vault
CREATE OR REPLACE FUNCTION public.delete_integration_secret(
  p_id UUID
) RETURNS VOID
SECURITY DEFINER
SET search_path = vault, public
LANGUAGE SQL AS $$
  DELETE FROM vault.secrets WHERE id = p_id;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

-- Providers are readable by everyone
CREATE POLICY "providers_public_read" ON public.integration_providers
  FOR SELECT USING (true);

-- Users can only see their own integrations
CREATE POLICY "user_integrations_own" ON public.user_integrations
  FOR ALL USING (auth.uid() = user_id);

-- OAuth states scoped to owner
CREATE POLICY "oauth_states_own" ON public.oauth_states
  FOR ALL USING (auth.uid() = user_id);
