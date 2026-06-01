import { ArrowRight, CheckCircle, Pause, Flag, Trash2, RotateCcw, Mail, Lock, Server, AlertTriangle, CreditCard, Globe, RefreshCw, Clock, Shield } from 'lucide-react';

/**
 * Reference panel that documents how the billing/site lifecycle, dunning,
 * and email cascade work. Pure copy — no data fetches. The intent is that
 * any admin (or the founder) can open this and understand the whole flow
 * without grepping the code.
 */
export function LifecycleReference() {
  return (
    <div className="space-y-6">

      {/* ── Lifecycle at a glance (site ↔ domain) ─────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Lifecycle at a glance</h2>
        <p className="text-xs text-gray-500 mb-5">One platform, two resource types. Sites and domains move through the same <strong>phases</strong> — they just carry different status labels. Specifics for each are in the sections below.</p>

        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <PhaseRow phase="Setting up" color="blue" site="provisioning" domain="pending" />
              <PhaseRow phase="Live" color="emerald" site="active" domain="registered" />
              <PhaseRow phase="At risk" color="amber" site="paused" domain="auto_renew off → lapsing" />
              <PhaseRow phase="Ending" color="red" site="flagged_for_deletion → deleted" domain="lapsed / released" />
              <PhaseRow phase="Error" color="red" site="failed" domain="failed" />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Domains have no DB status for <em>At risk</em> / <em>Ending</em> — those are conditions (auto_renew off, expiry passed); the row stays <code className="text-[11px] font-mono">registered</code> until cleaned up. The underlying statuses stay distinct on purpose (billing arc vs annual-renewal arc) — this table is just the shared vocabulary for reasoning across both.
        </p>
      </section>

      {/* ── Site states ───────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Site lifecycle states</h2>
        <p className="text-xs text-gray-500 mb-5">Every site sits in one of these states. Transitions are driven by Stripe, the customer, or an admin.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StateCard color="emerald" icon={CheckCircle} title="active" desc="Site is live, Stripe sub is current, customer can manage normally." />
          <StateCard color="amber" icon={Pause} title="paused" desc="Stripe subscription was cancelled (auto-dunning or manual). Site stays online; sits in cleanup queue." />
          <StateCard color="red" icon={Flag} title="flagged_for_deletion" desc="Admin has marked this site for deletion. Final-warning email sent. Awaiting admin confirmation." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StateCard color="gray" icon={Trash2} title="deleted" desc="Admin confirmed delete; wp.cloud hard-delete called. Files + database gone." />
          <StateCard color="blue" icon={Server} title="provisioning" desc="Stripe payment cleared, wp.cloud is spinning the site up." />
          <StateCard color="red" icon={AlertTriangle} title="failed" desc="wp.cloud provisioning failed. Needs manual intervention." />
        </div>
      </section>

      {/* ── State transitions ────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Transitions</h2>
        <p className="text-xs text-gray-500 mb-5">Who or what triggers each move.</p>

        <div className="space-y-3">
          <FlowRow from="active" to="paused" trigger="Stripe `customer.subscription.deleted`" detail="Stripe gave up on dunning, OR customer cancelled from portal. Site stays online." />
          <FlowRow from="paused" to="active" trigger="Customer restarts subscription" detail="A new active hosting subscription is created; sites reactivate (currently manual via support)." />
          <FlowRow from="paused" to="flagged_for_deletion" trigger="Admin clicks Flag in /admin/services?view=cleanup" detail="Final-warning email sent to owner. Site still live." />
          <FlowRow from="flagged_for_deletion" to="paused" trigger="Admin clicks Unflag in cleanup queue" detail="Pulls the site back out of the queue. No customer email." />
          <FlowRow from="flagged_for_deletion" to="deleted" trigger="Admin clicks Delete in cleanup queue" detail="Calls wp.cloud hard-delete-site. Owner gets a 'site deleted' email. Permanent." />
          <FlowRow from="active" to="flagged_for_deletion" trigger="Customer deletes site from dashboard" detail="Soft-delete routes through cleanup queue rather than purging immediately. Same admin-confirms-delete flow." />
        </div>
      </section>

      {/* ── Dunning timeline ─────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Stripe-driven dunning</h2>
        <p className="text-xs text-gray-500 mb-5">We don&apos;t run our own grace timer. Stripe handles retries, then we react to the cancel.</p>

        <ol className="space-y-3">
          <TimelineRow num={1} label="Day 0 — Charge fails" detail="Stripe fires invoice.payment_failed. We send the Payment Failed email." />
          <TimelineRow num={2} label="Days 1–~21 — Stripe Smart Retries" detail="Stripe retries the card 3–4 times based on retry settings. Stripe also sends its own card-failure emails." />
          <TimelineRow num={3} label="~Day 21 — Subscription auto-cancels" detail="Stripe gives up. customer.subscription.deleted fires. We flip every site on that sub to paused and send the Sites Paused email." />
          <TimelineRow num={4} label="Manual review" detail="Sites sit paused until an admin opens the cleanup queue and either flags them for deletion or restores them." />
          <TimelineRow num={5} label="Manual delete" detail="Admin must explicitly confirm delete on flagged sites. Nothing is auto-purged." />
        </ol>

        <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-900"><strong>Tweak the retry window in Stripe:</strong> Dashboard → Settings → Billing → Subscriptions and emails → Retry settings.</p>
        </div>
      </section>

      {/* ── Email cascade ────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Email cascade</h2>
        <p className="text-xs text-gray-500 mb-5">Every state change sends a customer notification. Test all of these from the Emails tab.</p>

        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trigger</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <EmailRow trigger="Stripe invoice.paid" email="Invoice Receipt" sender="stripe-webhook" />
              <EmailRow trigger="Stripe invoice.payment_failed" email="Payment Failed" sender="stripe-webhook" />
              <EmailRow trigger="Stripe customer.subscription.deleted" email="Sites Paused" sender="stripe-webhook" />
              <EmailRow trigger="Admin flags paused site" email="Site Flagged for Deletion" sender="cleanup-site API" />
              <EmailRow trigger="Admin confirms delete" email="Site Deleted" sender="cleanup-site API" />
              <EmailRow trigger="Site provisioning completes" email="Site Ready" sender="provision-hosting fn" />
              <EmailRow trigger="Site provisioning fails" email="Provisioning Failed" sender="provision-hosting fn" />
              <EmailRow trigger="First payment / new account" email="Welcome Email" sender="stripe-webhook" />
              <EmailRow trigger="Domain registered (OpenSRS)" email="Domain Registered" sender="domain provisioning" />
              <EmailRow trigger="Domain expiring 30/14/7/1 days out" email="Domain Expiry Warning" sender="daily cron" />
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Subscription rules ───────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Subscription rules</h2>
        <p className="text-xs text-gray-500 mb-5">How hosting + domain subscriptions are structured per account.</p>

        <ul className="space-y-3 text-sm text-gray-700">
          <RuleRow icon={Lock} title="One hosting subscription per user" detail="Account-centric model. findHostingSubscription() reads stripe.subscriptions (Sync Engine mirror) via users.stripe_customer_id. Adding a second site reuses the sub and adds a Stripe line item." />
          <RuleRow icon={Server} title="Each site = one Stripe line item" detail="sites.stripe_subscription_item_id is the link. The parent subscription is looked up through the user (no per-site subscription FK)." />
          <RuleRow icon={CheckCircle} title="Sites limited per plan" detail="products.metadata.sites_allowed (Minimum=1, Growth=5). Enforced in /api/create-site — returns 403 if cap reached." />
          <RuleRow icon={Mail} title="Domains are independent" detail="Domain renewals are managed separately as cron-based one-time charges. Customers can have many in parallel." />
        </ul>
      </section>

      {/* ── Domain lifecycle states ──────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Domain lifecycle states</h2>
        <p className="text-xs text-gray-500 mb-5">Domains live at OpenSRS; the <code className="text-[11px] font-mono">domains</code> row mirrors their state. Fully independent of hosting — a customer can hold many in parallel.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StateCard color="blue" icon={Clock} title="pending" desc="Checkout cleared; the OpenSRS SW_REGISTER call is in flight. Flips to registered or failed." />
          <StateCard color="emerald" icon={Globe} title="registered" desc="Live at OpenSRS, expiry_date set. The only state the renewal cron acts on." />
          <StateCard color="red" icon={AlertTriangle} title="failed" desc="OpenSRS registration didn't complete. Surfaces under Health → Overview → Problem Domains; admin can retry." />
        </div>
        <p className="text-xs text-gray-400 mt-4">There is no separate <code className="text-[11px] font-mono">expired</code> status — expiry is handled by the renewal cron + the <code className="text-[11px] font-mono">auto_renew</code> flag, not a status flip.</p>
      </section>

      {/* ── Domain transitions ───────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Domain transitions</h2>
        <p className="text-xs text-gray-500 mb-5">How a domain moves between states.</p>

        <div className="space-y-3">
          <FlowRow from="(checkout)" to="pending" trigger="Stripe payment for a domain clears" detail="Webhook → /api/internal/opensrs/register-domain inserts the domains row as pending and calls OpenSRS SW_REGISTER." />
          <FlowRow from="pending" to="registered" trigger="OpenSRS registration succeeds" detail="expiry_date computed, opensrs_domains mirror upserted, Domain Registered email sent." />
          <FlowRow from="pending" to="failed" trigger="OpenSRS returns an error" detail="Error stored in metadata; appears in Health → Problem Domains." />
          <FlowRow from="failed" to="registered" trigger="Admin retries registration" detail="Re-runs SW_REGISTER for the same domain (domain-retry-register)." />
          <FlowRow from="registered" to="registered" trigger="Yearly renewal (cron)" detail="On a successful charge + OpenSRS renew, expiry_date is pushed out a year. Status doesn't change." />
        </div>
      </section>

      {/* ── Domain renewals ──────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Domain renewals</h2>
        <p className="text-xs text-gray-500 mb-5">Envosta drives renewals — <strong>not</strong> OpenSRS auto-renew. Registration deliberately sets the OpenSRS side to <code className="text-[11px] font-mono">auto_renew=0 / let_expire=1</code> so the daily cron is the single source of truth.</p>

        <ol className="space-y-3">
          <TimelineRow num={1} label="Daily sweep — process-domain-renewals (09:00 UTC)" detail="Pulls domains where status=registered, auto_renew=true, and expiry_date is within the renewal window (DOMAIN_RENEWAL_WINDOW_DAYS, default 7)." />
          <TimelineRow num={2} label="Charge off-session" detail="A durable Vercel Workflow (renewDomain) charges the customer's saved card via Stripe (off-session PaymentIntent), idempotency-pinned per UTC day so a double-fire can't double-charge." />
          <TimelineRow num={3} label="Renew at OpenSRS" detail="On a successful charge it calls OpenSRS renew, pushes expiry_date out a year, and updates the opensrs_domains mirror." />
          <TimelineRow num={4} label="Outcomes" detail="renewed · charge_failed · opensrs_failed · skipped. Failures back off (RETRY_BACKOFF_HOURS) and retry next sweep; an in-progress flag guards against double-charge." />
          <TimelineRow num={5} label="Expiry warnings" detail="The daily health-check cron emails the customer a Domain Expiry Warning at 30 / 14 / 7 / 1 days out." />
        </ol>

        <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-900"><strong>auto_renew is a customer toggle</strong> on <code className="text-[11px] font-mono">domains.auto_renew</code> — purely the cron filter. Turn it off and the domain simply isn't swept (it lapses at expiry). The OpenSRS-side flag stays off regardless.</p>
        </div>
      </section>

      {/* ── Domain rules ─────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Domain management rules</h2>
        <p className="text-xs text-gray-500 mb-5">Per-domain controls and where their state lives.</p>

        <ul className="space-y-3 text-sm text-gray-700">
          <RuleRow icon={RefreshCw} title="Renewals are one-time charges, not subscriptions" detail="Unlike hosting, domains aren't Stripe subscriptions. The cron fires an annual off-session PaymentIntent per domain." />
          <RuleRow icon={Shield} title="WHOIS privacy + transfer lock" detail="Toggled from the domain's Settings tab → /api/internal/opensrs (set_whois_privacy, set_registrar_lock), then mirrored to opensrs_domains." />
          <RuleRow icon={Server} title="DNS is customer-managed; OpenSRS is source of truth" detail="opensrs_dns_records mirrors the zone; the reconcile-opensrs cron pulls upstream changes back in." />
          <RuleRow icon={Lock} title="Transfer-out goes through support" detail="The EPP / auth code is never surfaced in the UI (it's the transfer secret). Customers request it via support." />
        </ul>
      </section>

      {/* ── Admin actions ────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Admin actions</h2>
        <p className="text-xs text-gray-500 mb-5">Where to do what. All hard deletes are manual.</p>

        <ul className="space-y-3">
          <ActionRow icon={Flag} label="Cleanup queue" path="/admin/services?view=cleanup" detail="View paused + flagged sites. Flag for deletion, unflag, or confirm delete." />
          <ActionRow icon={CreditCard} label="Plan products + prices" path="/admin/settings → Hosting Plans" detail="Set USD/CAD prices for monthly + yearly. Save triggers sync; 4 Stripe prices land under one product." />
          <ActionRow icon={Mail} label="Test any email" path="/admin/settings → Emails" detail="Preview + send any template to your own inbox." />
          <ActionRow icon={RotateCcw} label="Restore a flagged site" path="/admin/services?view=cleanup → Unflag" detail="Pulls site back to paused so customer can restart subscription." />
          <ActionRow icon={RefreshCw} label="Retry a failed domain" path="/admin/domains → failed domain → Retry" detail="Re-runs the OpenSRS registration for a domain stuck in failed." />
          <ActionRow icon={Globe} label="Domain / TLD pricing" path="/admin/settings → Domain TLDs" detail="Per-TLD register/renew prices (CAD + USD). The OpenSRS price-check button applies cost + 25%." />
        </ul>
      </section>
    </div>
  );
}

function PhaseRow({ phase, color, site, domain }: { phase: string; color: string; site: string; domain: string }) {
  const dot: Record<string, string> = {
    blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-gray-400',
  };
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-900">
          <span className={`w-2 h-2 rounded-full ${dot[color] ?? dot.gray}`} />
          {phase}
        </span>
      </td>
      <td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-600">{site}</code></td>
      <td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-600">{domain}</code></td>
    </tr>
  );
}

function StateCard({ color, icon: Icon, title, desc }: { color: string; icon: any; title: string; desc: string }) {
  const palette: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', iconBg: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', iconBg: 'bg-red-100' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', iconBg: 'bg-gray-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', iconBg: 'bg-blue-100' },
  };
  const c = palette[color] ?? palette.gray;
  return (
    <div className={`p-4 rounded-lg border ${c.border} ${c.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${c.iconBg} ${c.text}`}><Icon className="w-3.5 h-3.5" /></div>
        <code className={`text-xs font-mono font-semibold ${c.text}`}>{title}</code>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function FlowRow({ from, to, trigger, detail }: { from: string; to: string; trigger: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center gap-2 shrink-0 min-w-[260px]">
        <code className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">{from}</code>
        <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <code className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">{to}</code>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900">{trigger}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function TimelineRow({ num, label, detail }: { num: number; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">{num}</div>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}

function EmailRow({ trigger, email, sender }: { trigger: string; email: string; sender: string }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5 text-xs text-gray-700 font-mono">{trigger}</td>
      <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{email}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{sender}</td>
    </tr>
  );
}

function RuleRow({ icon: Icon, title, detail }: { icon: any; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}

function ActionRow({ icon: Icon, label, path, detail }: { icon: any; label: string; path: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <code className="text-xs text-gray-500 font-mono">{path}</code>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}
