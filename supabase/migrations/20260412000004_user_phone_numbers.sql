-- ═══════════════════════════════════════════════════════════
-- PHONE NUMBERS TABLE (like domains — user-owned, optionally linked to site)
-- Date: 2026-04-12
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,  -- linked later, nullable
  phone_number TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',    -- receptionist_config (greeting, voice, business hours, etc.)
  twilio_sid TEXT,               -- Twilio IncomingPhoneNumber SID for release
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_numbers_number
  ON public.phone_numbers(phone_number);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user
  ON public.phone_numbers(user_id);

-- Fast lookup by site (for webhook routing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_numbers_site
  ON public.phone_numbers(site_id)
  WHERE site_id IS NOT NULL;

-- Disable RLS (admin service role handles access)
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.phone_numbers
  FOR ALL USING (true) WITH CHECK (true);

-- Migrate existing numbers from sites table into phone_numbers
INSERT INTO public.phone_numbers (user_id, site_id, phone_number, enabled, config)
SELECT
  s.user_id,
  s.id,
  s.twilio_phone_number,
  COALESCE(s.receptionist_enabled, false),
  COALESCE(s.receptionist_config, '{}')
FROM public.sites s
WHERE s.twilio_phone_number IS NOT NULL
  AND s.user_id IS NOT NULL
ON CONFLICT (phone_number) DO NOTHING;
