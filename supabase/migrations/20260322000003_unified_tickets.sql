-- ============================================================================
-- Unified Ticket System
-- Handles support tickets, studio design requests, and sales inquiries
-- ============================================================================

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    site_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('support', 'studio', 'sales')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'quoted', 'approved', 'completed', 'closed')),
    quote_amount INTEGER,
    contact_name TEXT,
    contact_email TEXT,
    source TEXT NOT NULL DEFAULT 'dashboard' CHECK (source IN ('dashboard', 'contact-form', 'partner-form', 'manual')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('customer', 'admin', 'ai-draft')),
    message TEXT NOT NULL,
    is_draft BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE TRIGGER set_updated_at_tickets
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_type ON public.tickets(type);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: customers see their own
CREATE POLICY tickets_user_select ON public.tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Tickets: customers can insert their own
CREATE POLICY tickets_user_insert ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Tickets: admins can do everything
CREATE POLICY tickets_admin_all ON public.tickets
  FOR ALL TO authenticated USING (public.is_admin());

-- Tickets: anon can insert sales tickets (contact forms)
CREATE POLICY tickets_anon_insert ON public.tickets
  FOR INSERT TO anon WITH CHECK (type = 'sales');

-- Messages: customers see messages on their tickets
CREATE POLICY messages_user_select ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()));

-- Messages: customers can insert on their tickets
CREATE POLICY messages_user_insert ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()));

-- Messages: admins can do everything
CREATE POLICY messages_admin_all ON public.ticket_messages
  FOR ALL TO authenticated USING (public.is_admin());

-- Grants
GRANT SELECT, INSERT ON public.tickets TO anon;
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_messages TO authenticated;
