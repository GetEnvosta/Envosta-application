-- Affiliate referral tracking: unique codes + click/signup attribution
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Referral click tracking
CREATE TABLE IF NOT EXISTS public.referral_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code TEXT NOT NULL,
    affiliate_id UUID NOT NULL REFERENCES public.users(id),
    ip_address TEXT,
    user_agent TEXT,
    converted BOOLEAN DEFAULT false,
    customer_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_affiliate ON public.referral_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created ON public.referral_clicks(created_at DESC);

-- Disable RLS (auth handled at application level)
ALTER TABLE public.referral_clicks DISABLE ROW LEVEL SECURITY;
