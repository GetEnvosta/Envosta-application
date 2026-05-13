-- ═══════════════════════════════════════════════════════════
-- PHASE 1: ENABLE RLS ON CUSTOMER-FACING TABLES
-- Date: 2026-05-06
--
-- Per the architecture audit, no customer-facing tables had RLS — the
-- application layer was the only enforcement. This migration enables
-- RLS on users, sites, domains, subscriptions, invoices, tickets,
-- ticket_messages, commissions with policies that:
--   - Allow user to SELECT/INSERT/UPDATE own resources via auth.uid()
--   - Allow admin/staff role to SELECT/UPDATE all
--   - Service-role client (webhooks, workflows, crons) bypasses RLS automatically
--
-- All read paths in src/services/*.ts use the user-scoped Supabase
-- client (createClient from @/lib/supabase-server), so they will respect
-- these policies. Service-role usage (webhooks, edge functions, cron
-- routes) bypasses RLS automatically and is unaffected.
-- ═══════════════════════════════════════════════════════════

-- ─── HELPER: admin/staff predicate ──────────────────────
-- Wrapped as a SECURITY DEFINER function to avoid infinite recursion when
-- a policy on `users` references `users` itself.
CREATE OR REPLACE FUNCTION public.fn_is_admin_or_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin','staff','affiliate')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ─── USERS ──────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own row" ON public.users;
CREATE POLICY "Users can view own row"
    ON public.users FOR SELECT
    USING (id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
    ON public.users FOR UPDATE
    USING (id = auth.uid() OR public.fn_is_admin_or_staff());

-- ─── SITES ──────────────────────────────────────────────
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
CREATE POLICY "Users can view own sites"
    ON public.sites FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
CREATE POLICY "Users can update own sites"
    ON public.sites FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can insert own sites" ON public.sites;
CREATE POLICY "Users can insert own sites"
    ON public.sites FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ─── DOMAINS ────────────────────────────────────────────
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own domains" ON public.domains;
CREATE POLICY "Users can view own domains"
    ON public.domains FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can update own domains" ON public.domains;
CREATE POLICY "Users can update own domains"
    ON public.domains FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can insert own domains" ON public.domains;
CREATE POLICY "Users can insert own domains"
    ON public.domains FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ─── SUBSCRIPTIONS ──────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ─── INVOICES ───────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ─── TICKETS ────────────────────────────────────────────
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets"
    ON public.tickets FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Users can update own tickets"
    ON public.tickets FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Users can insert own tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ─── TICKET MESSAGES ────────────────────────────────────
-- Users can see/insert messages on a ticket they own; admin/staff can see/insert all.
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for own tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for own tickets"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_messages.ticket_id
              AND (t.user_id = auth.uid() OR public.fn_is_admin_or_staff())
        )
    );

DROP POLICY IF EXISTS "Users can insert messages on own tickets" ON public.ticket_messages;
CREATE POLICY "Users can insert messages on own tickets"
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_messages.ticket_id
              AND (t.user_id = auth.uid() OR public.fn_is_admin_or_staff())
        )
    );

-- ─── COMMISSIONS ────────────────────────────────────────
-- Earners (partners/affiliates) can read their own commission rows; admin can read all.
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Earners can view own commissions" ON public.commissions;
CREATE POLICY "Earners can view own commissions"
    ON public.commissions FOR SELECT
    USING (earner_id = auth.uid() OR public.fn_is_admin_or_staff());
