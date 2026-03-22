-- ============================================================================
-- Studio Requests tracking table
-- Tracks $250 one-off design/development requests from customers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.studio_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    stripe_payment_id TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'in_progress', 'completed', 'cancelled')),
    amount_cad INTEGER NOT NULL DEFAULT 25000,
    admin_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_studio_requests
  BEFORE UPDATE ON public.studio_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index
CREATE INDEX idx_studio_requests_user ON public.studio_requests(user_id);
CREATE INDEX idx_studio_requests_status ON public.studio_requests(status);

-- RLS
ALTER TABLE public.studio_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY studio_requests_user_select ON public.studio_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admins can do everything
CREATE POLICY studio_requests_admin_all ON public.studio_requests
  FOR ALL TO authenticated USING (public.is_admin());

-- Service role can insert (from webhook)
GRANT SELECT, INSERT, UPDATE ON public.studio_requests TO authenticated;
