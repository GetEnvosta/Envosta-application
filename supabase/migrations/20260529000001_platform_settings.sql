-- Platform-wide key-value settings (service-role only).
-- (Re)created for Settings → Crons: stores `cron:<name>` enable flags + last-run state.
-- Additive + idempotent — safe to run whether or not the table already exists.
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_platform_settings_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_settings_updated ON platform_settings;
CREATE TRIGGER trg_platform_settings_updated
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION fn_platform_settings_updated();

-- RLS on with no policies → only the service-role key (admin API routes) can read/write.
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
