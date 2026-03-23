-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'blog',
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (anon insert)
CREATE POLICY newsletter_anon_insert ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admins can see all
CREATE POLICY newsletter_admin_all ON public.newsletter_subscribers
  FOR ALL TO authenticated USING (public.is_admin());

GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;

-- Studio waitlist
CREATE TABLE IF NOT EXISTS public.studio_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    business_name TEXT,
    website_url TEXT,
    description TEXT NOT NULL,
    budget TEXT,
    timeline TEXT,
    source TEXT DEFAULT 'website',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (anon insert)
CREATE POLICY waitlist_anon_insert ON public.studio_waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admins can see all
CREATE POLICY waitlist_admin_all ON public.studio_waitlist
  FOR ALL TO authenticated USING (public.is_admin());

GRANT INSERT ON public.studio_waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.studio_waitlist TO authenticated;
