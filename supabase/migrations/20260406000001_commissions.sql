-- Commission tracking for sales reps (manual payouts) and customer referrals (Stripe credit)
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sales_rep', 'referral')),
    earner_id UUID NOT NULL REFERENCES public.users(id),
    customer_id UUID REFERENCES public.users(id),
    ticket_id UUID REFERENCES public.tickets(id),
    amount_cad INTEGER NOT NULL,
    payout_method TEXT CHECK (payout_method IN ('stripe_credit', 'etransfer', 'cheque', 'payroll')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    stripe_txn_id TEXT,
    approved_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commissions_earner ON public.commissions(earner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_type ON public.commissions(type);
CREATE INDEX IF NOT EXISTS idx_commissions_created ON public.commissions(created_at DESC);
