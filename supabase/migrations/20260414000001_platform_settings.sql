-- Platform-wide settings (admin-only key-value store)
-- Used for Envosta phone config, feature flags, etc.
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION fn_platform_settings_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platform_settings_updated
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION fn_platform_settings_updated();

-- No RLS — only accessed via service role key from admin API routes
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (no policies needed for anon/authenticated since
-- only admin API routes with service role key access this table)
