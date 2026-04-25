'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Folder, FileCode, Layers, Database, Wrench, Globe2, Sparkles, Lock, GitBranch } from 'lucide-react';

/**
 * RepoDocs — System > Repo tab
 *
 * Live documentation of every meaningful file in the Envosta application
 * repo. Grouped by architectural concern, with a one-line "purpose" per
 * file and a "reasoning" block explaining why each grouping is organized
 * the way it is. Searchable + collapsible.
 *
 * This is hand-curated, not auto-generated, so the descriptions reflect
 * intent and trade-offs, not just file paths.
 */

type FileEntry = { path: string; purpose: string };
type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  reasoning: string;
  groups: { label: string; files: FileEntry[] }[];
};

const SECTIONS: Section[] = [
  {
    id: 'arch',
    title: 'Architecture overview',
    icon: Layers,
    reasoning:
      'Envosta is a Next.js 15 (App Router) monolith. One repo serves three audiences via route groups: marketing (public), app (signed-in dashboards), and studio (the AI builder). Auth is Supabase. Payments are Stripe. Hosting backend is Automattic\'s wp.cloud (Atomic). Domains run through OpenSRS. SMS/voice is Twilio. The middleware enforces role-based access. RLS is intentionally OFF — all auth checks happen in services/* with the server-role Supabase client, so policies don\'t fight us in admin tooling.',
    groups: [
      { label: 'Top-level concerns', files: [
        { path: 'middleware.ts', purpose: 'Edge middleware. Reads Supabase session, gates /admin and /partner by role, redirects unauthenticated users from app routes.' },
        { path: 'next.config.js', purpose: 'Next config: image domains, redirects, server externals.' },
        { path: 'tsconfig.json', purpose: 'Path alias `@/*` → `src/*`. Strict TS.' },
        { path: 'tailwind.config.ts / postcss.config.js', purpose: 'Tailwind v3 with the admin/cyan/emerald palette and the studio purple. PostCSS pipeline.' },
        { path: 'vercel.json', purpose: 'Cron schedules (renewals, expiry checks, abandoned cart sweeps).' },
        { path: 'package.json', purpose: 'Single workspace. Notable deps: @supabase/ssr, stripe, @anthropic-ai/sdk, twilio, jszip, lucide-react.' },
      ]},
    ],
  },

  {
    id: 'lib',
    title: 'src/lib — primitives & shared helpers',
    icon: Wrench,
    reasoning:
      'lib/* holds zero-business-logic primitives: Supabase clients, formatting, retry/rate-limit, Stripe wiring, vault encryption, and the Studio prompt/template/import toolkit. Anything that calls Supabase to read business state lives in services/*, not here. Studio-specific helpers are prefixed `studio-` so they sort together and stay easy to delete if the feature is ever cut out.',
    groups: [
      { label: 'Auth & infra primitives', files: [
        { path: 'lib/supabase-server.ts', purpose: 'Server-side Supabase client (cookie-bound). Used by RSC and route handlers.' },
        { path: 'lib/supabase-browser.ts', purpose: 'Browser-side Supabase client for client components.' },
        { path: 'lib/supabase-admin.ts', purpose: 'Service-role client. Bypasses RLS. Only imported in trusted server code.' },
        { path: 'lib/roles.ts', purpose: 'Role constants + checks (admin / affiliate / partner / customer).' },
        { path: 'lib/vault.ts', purpose: 'AES-GCM symmetric encryption for OpenSRS credentials and other secrets stored in DB.' },
        { path: 'lib/rate-limit.ts', purpose: 'In-memory IP rate limiter. Used on anonymous Studio briefs and intake forms.' },
        { path: 'lib/fetch-retry.ts', purpose: 'Wrapper for upstream APIs (wp.cloud, OpenSRS) with exponential backoff.' },
        { path: 'lib/utils.ts', purpose: 'Misc: formatCents, formatDate, statusColor, slugify, classnames helper.' },
        { path: 'lib/stripe-subscription.ts', purpose: 'Helpers to add/remove subscription items, swap prices, compute proration.' },
      ]},
      { label: 'Studio toolkit', files: [
        { path: 'lib/studio-prompts.ts', purpose: 'System prompts for /api/studio/* — buildGenerateSystemPrompt + buildReferenceRebuildSystemPrompt factories, BRIEF_SYSTEM_PROMPT, and the gradient/layout contracts.' },
        { path: 'lib/studio-style-presets.ts', purpose: 'Curated palette/font/spacing presets used as starting points before AI customization.' },
        { path: 'lib/studio-page-templates.ts', purpose: 'Default page outlines (Home / About / Services / Contact / etc) used when planning new sites.' },
        { path: 'lib/studio-wxr.ts', purpose: 'Builds the WXR XML export — pages, menus, _envosta_* post-meta.' },
        { path: 'lib/studio-import.ts', purpose: 'Server-side WXR ingest helper for the import-html flow.' },
        { path: 'lib/studio-block-splice.ts', purpose: 'Anchor-aware splicing of <!-- wp:group {"anchor":"section-X"} --> blocks for per-section regen.' },
        { path: 'lib/studio-html-strip.ts', purpose: 'Sanitizes pasted HTML references before they\'re fed to the model.' },
        { path: 'lib/extract-styles-from-html.ts', purpose: 'Heuristic extractor that pulls colors/fonts out of a reference HTML so suggestions seed the palette.' },
        { path: 'lib/envosta-theme-tokens.ts', purpose: 'Live loader for parent theme tokens from github.com/GetEnvosta/Envosta-Theme. SHA-throttled in-memory cache (10-min). No env vars — public repo.' },
      ]},
    ],
  },

  {
    id: 'services',
    title: 'src/services — business logic & DB access',
    icon: Database,
    reasoning:
      'Every read/write to Supabase that matters goes through services/*. They take a server Supabase client and return typed shapes. Routes and RSCs are thin: they auth-check, call a service, render. This keeps SQL out of UI code and lets us mock/replace data sources in one place. RLS is off, so every service is responsible for owner/role checks via getCurrentUser() / getUserProfile() before mutating.',
    groups: [
      { label: 'Domain services', files: [
        { path: 'services/auth.ts', purpose: 'getCurrentUser, getUserProfile, role lookups, impersonation helpers.' },
        { path: 'services/sites.ts', purpose: 'CRUD for the sites table + wp.cloud provisioning glue.' },
        { path: 'services/billing.ts', purpose: 'All billing-domain queries: subscriptions, invoices, charges, payment method sync, MRR rollups, abandoned-checkout count, toMonthly() normalization.' },
        { path: 'services/domains.ts', purpose: 'Domain records + OpenSRS state sync.' },
        { path: 'services/partners.ts', purpose: 'Partner/affiliate program data.' },
        { path: 'services/commissions.ts', purpose: 'Commission calculation + payout state.' },
        { path: 'services/tickets.ts', purpose: 'Ticket queries by type (studio / support / onboarding / sales).' },
        { path: 'services/blog.ts', purpose: 'Marketing blog post loader.' },
        { path: 'services/plans.ts', purpose: 'Hosting plan products + pricing tiers (CAD/USD, monthly/yearly/multi-year).' },
        { path: 'services/admin.ts', purpose: 'Admin dashboard rollups: counts, recent customers, recent activity, customer detail aggregator.' },
        { path: 'services/twilio-admin.ts', purpose: 'Twilio number provisioning + SMS log queries for the admin Phone tab.' },
      ]},
    ],
  },

  {
    id: 'app-app',
    title: 'src/app/(app) — signed-in dashboards',
    icon: Lock,
    reasoning:
      'The (app) route group is wrapped in DashboardShell or AdminShell. Middleware blocks unauthenticated users at the group level. Within (app), `admin/*` is admin-only, `partner/*` is partner-only, and `dashboard/*` is the customer view. Subroutes mirror data shape: `/admin/customers/[id]` shows everything about one user; `/admin/services/[id]` shows one site. Detail pages aggregate via getCustomerRelatedData() rather than paginating.',
    groups: [
      { label: 'Customer dashboard', files: [
        { path: 'app/(app)/dashboard/page.tsx', purpose: 'Customer home: sites, domains, invoices, support tickets.' },
        { path: 'app/(app)/dashboard/sites/[id]/*', purpose: 'Per-site detail: stats, backups, SSH, plugins, plan changes.' },
        { path: 'app/(app)/dashboard/billing/*', purpose: 'Invoices, payment methods, subscription management.' },
        { path: 'app/(app)/dashboard/account/*', purpose: 'Profile, security, preferences.' },
      ]},
      { label: 'Admin', files: [
        { path: 'app/(app)/admin/page.tsx', purpose: 'Admin home: stats, recent tickets by type, recent signups, recent activity.' },
        { path: 'app/(app)/admin/customers/[id]/page.tsx', purpose: 'Customer detail: sites, domains, subscriptions, invoices, activity. Single-line rows for sites/domains.' },
        { path: 'app/(app)/admin/services/[id]/page.tsx', purpose: 'Site detail with wp.cloud admin actions, resource controls, sync status.' },
        { path: 'app/(app)/admin/domains/*', purpose: 'Domain management + TLD pricing config.' },
        { path: 'app/(app)/admin/products/*', purpose: 'Hosting plans, addons, one-time services, invoice list.' },
        { path: 'app/(app)/admin/subscriptions/page.tsx', purpose: 'All active subscriptions across customers, with filters.' },
        { path: 'app/(app)/admin/tickets/*', purpose: 'Tickets queue + per-ticket reply UI. Type-filtered (studio/support/onboarding).' },
        { path: 'app/(app)/admin/partners/*', purpose: 'Partner accounts + per-partner client list.' },
        { path: 'app/(app)/admin/commissions/page.tsx', purpose: 'Commission ledger and payout actions.' },
        { path: 'app/(app)/admin/billing/page.tsx', purpose: 'Platform-level billing health.' },
        { path: 'app/(app)/admin/reporting/page.tsx', purpose: 'MRR, churn, abandoned carts, lifecycle reporting.' },
        { path: 'app/(app)/admin/promotions/page.tsx', purpose: 'Coupon manager.' },
        { path: 'app/(app)/admin/diagnostics/page.tsx', purpose: 'System tab — health, logs, emails, phone, stripe, promotions, lifecycle, and this Repo doc.' },
        { path: 'app/(app)/admin/blog/*', purpose: 'Marketing blog editor.' },
        { path: 'app/(app)/admin/sites/cleanup/page.tsx', purpose: 'Cancelled-site recovery window manager.' },
        { path: 'app/(app)/admin/studio/*', purpose: 'Admin entry point that opens the Studio tool with full context.' },
        { path: 'app/(app)/admin/logs/page.tsx', purpose: 'Raw admin logs — kept separate from the System tab\'s logs view for direct linking.' },
      ]},
      { label: 'Partner', files: [
        { path: 'app/(app)/partner/*', purpose: 'Partner dashboard: clients, commissions, marketplace, ticket routing.' },
      ]},
    ],
  },

  {
    id: 'app-marketing',
    title: 'src/app/(marketing) — public pages',
    icon: Globe2,
    reasoning:
      'Public pages live in their own route group so they bypass the dashboard shell and don\'t carry session cookies in the bundle. Each page is its own folder so it can have local components and metadata. Heavy marketing copy is co-located with the page rather than centralized — easier to evolve per-page without merge conflicts.',
    groups: [
      { label: 'Marketing site', files: [
        { path: 'app/(marketing)/page.tsx', purpose: 'Homepage.' },
        { path: 'app/(marketing)/features/page.tsx', purpose: 'Feature list.' },
        { path: 'app/(marketing)/pricing/page.tsx', purpose: 'Hosting + plan pricing.' },
        { path: 'app/(marketing)/plans/[slug]/page.tsx', purpose: 'Per-plan landing pages (Care, Direct, etc).' },
        { path: 'app/(marketing)/domains/page.tsx', purpose: 'Domain search + TLD pricing.' },
        { path: 'app/(marketing)/method/page.tsx', purpose: 'Process/methodology page.' },
        { path: 'app/(marketing)/affiliate/page.tsx', purpose: 'Affiliate program landing.' },
        { path: 'app/(marketing)/careers/page.tsx', purpose: 'Careers page.' },
        { path: 'app/(marketing)/support/page.tsx', purpose: 'Support entry / contact.' },
        { path: 'app/(marketing)/blog/*', purpose: 'Marketing blog index + post pages.' },
        { path: 'app/(marketing)/get-started/*', purpose: 'Anonymous hosting checkout — plan selection → Stripe checkout → provisioning.' },
        { path: 'app/(marketing)/buy-domain/*', purpose: 'Anonymous domain purchase flow via OpenSRS.' },
        { path: 'app/(marketing)/intake/*', purpose: 'Pre-onboarding intake form for new clients.' },
        { path: 'app/(marketing)/onboarding/*', purpose: 'Post-signup onboarding wizard.' },
        { path: 'app/(marketing)/legal/*', purpose: 'Terms, privacy, AUP.' },
      ]},
    ],
  },

  {
    id: 'app-studio',
    title: 'src/app/(studio) — full-screen builder',
    icon: Sparkles,
    reasoning:
      'Studio runs at /studio with no dashboard chrome — staff-only AI page builder. The previous (standalone) group has been folded into (marketing): /get-started and /buy-domain are anonymous-friendly checkout flows that share the marketing nav/footer rather than living in their own shell.',
    groups: [
      { label: 'Studio', files: [
        { path: 'app/(studio)/studio/page.tsx', purpose: 'Loads StudioTool. The actual UI lives in components/studio/* so it can be embedded inside admin too.' },
      ]},
    ],
  },

  {
    id: 'api',
    title: 'src/app/api — route handlers',
    icon: FileCode,
    reasoning:
      'API routes are organized by domain, not by HTTP method. Each folder owns one feature surface (e.g. /api/studio/* is the entire AI builder backend). This means a single change to "studio brief logic" touches one folder. Routes are thin: auth check → call a service → return JSON. Long-running AI calls set `export const maxDuration` explicitly. Webhooks live alongside the integration they serve (stripe, twilio, opensrs).',
    groups: [
      { label: 'Auth & user', files: [
        { path: 'api/auth/*', purpose: 'Sign-in/up callbacks, password reset, magic link, impersonation start/stop.' },
        { path: 'api/account/*', purpose: 'Profile updates, MFA, preferences.' },
      ]},
      { label: 'Studio (AI builder)', files: [
        { path: 'api/studio/brief/route.ts', purpose: 'Generates 3 concept options from a brief. Uses BRIEF_SYSTEM_PROMPT. Anonymous IP rate-limited.' },
        { path: 'api/studio/suggest-site-meta/route.ts', purpose: 'Fills missing businessName/tagline/industry/targetAudience from the brief. Haiku model.' },
        { path: 'api/studio/plan-sections/route.ts', purpose: 'Plans an ordered section list for a single page given full site context.' },
        { path: 'api/studio/generate/route.ts', purpose: 'Generates full block-markup pages. Uses buildGenerateSystemPrompt({ customHtmlBlocks }). Has a separate inline prompt for HTML-reference rebuilds.' },
        { path: 'api/studio/generate-section/route.ts', purpose: 'Per-section regen with anchor splicing back into the page.' },
        { path: 'api/studio/theme-tokens/route.ts', purpose: 'GET returns parent-theme tokens; ?refresh=1 forces refetch; POST clears cache (webhook target).' },
        { path: 'api/studio/import-html/route.ts', purpose: 'Accepts pasted HTML references, sanitizes, returns the cleaned input for the brief flow.' },
      ]},
      { label: 'Billing', files: [
        { path: 'api/billing/*', purpose: 'Checkout sessions, subscription mutations, invoice actions.' },
        { path: 'api/webhooks/stripe/route.ts', purpose: 'Stripe event handler — invoice.paid, subscription.updated, payment_intent.succeeded.' },
      ]},
      { label: 'Domains', files: [
        { path: 'api/domain/*', purpose: 'Domain search, registration, renewal, contact updates via OpenSRS.' },
      ]},
      { label: 'Admin tools', files: [
        { path: 'api/admin/*', purpose: 'Admin-gated mutations: assign owner, attach subscription, charge card, send invoice, etc.' },
      ]},
      { label: 'Partners', files: [
        { path: 'api/partner/*', purpose: 'Partner-side endpoints — client management, commission ledger reads.' },
      ]},
      { label: 'Misc & cron', files: [
        { path: 'api/cron/*', purpose: 'Vercel cron targets — renewal sweeps, abandoned cart, domain expiry checks.' },
        { path: 'api/twilio/*', purpose: 'Twilio webhooks for inbound SMS / voice.' },
        { path: 'api/healthz/route.ts', purpose: 'Liveness probe.' },
      ]},
    ],
  },

  {
    id: 'components',
    title: 'src/components — UI building blocks',
    icon: Folder,
    reasoning:
      'Components are grouped by audience (admin/, partner/, marketing/) plus shared primitives (ui/, layout/). Studio is its own folder because the builder is large enough to warrant its own design vocabulary. We deliberately avoid a single mega-`components/` flat dir — finding "the impersonate button" in admin/ is faster than scrolling 200 files.',
    groups: [
      { label: 'Shells & primitives', files: [
        { path: 'components/layout/layout-shell.tsx', purpose: 'Generic <LayoutShell> + <ShellAvatarDropdown>. Owns sidebar/mobile-overlay/header/active-link mechanics for all three audience shells.' },
        { path: 'components/layout/admin-shell.tsx', purpose: 'Admin shell — dark sidebar, sidebar-footer user/sign-out, /admin nav. Thin wrapper around LayoutShell.' },
        { path: 'components/layout/dashboard-shell.tsx', purpose: 'Customer shell — light sidebar, header avatar dropdown with Settings + (staff) Staff Panel, partner secondary nav.' },
        { path: 'components/layout/partner-shell.tsx', purpose: 'Partner shell — light sidebar, sky-600 active accent, dropdown with Customer View link.' },
        { path: 'components/layout/impersonation-banner.tsx', purpose: 'Banner shown when an admin is impersonating a customer.' },
        { path: 'components/ui/*', purpose: 'Buttons, inputs, modals, avatars, toasts. Tailwind-styled, no UI lib dependency.' },
      ]},
      { label: 'Admin components', files: [
        { path: 'components/admin/stat-card.tsx', purpose: 'The colored stat card used across admin dashboards.' },
        { path: 'components/admin/impersonate-button.tsx', purpose: 'Starts an impersonation session for a customer.' },
        { path: 'components/admin/charge-card.tsx', purpose: 'Charge a saved Stripe card immediately.' },
        { path: 'components/admin/invoice-form.tsx', purpose: 'Custom Stripe invoice creator. mode="quick" for inline (single customer), mode="full" for the standalone /admin/products/invoices page.' },
        { path: 'components/admin/attach-domain-subscription.tsx', purpose: 'Links an existing Stripe sub to a domain record.' },
        { path: 'components/admin/admin-site-actions.tsx', purpose: 'Per-site admin controls: restart, backup, SSH, suspend.' },
        { path: 'components/admin/resource-controls.tsx', purpose: 'PHP workers, storage, bandwidth controls.' },
        { path: 'components/admin/admin-create-site.tsx / admin-create-domain.tsx', purpose: 'Manual creation flows that bypass checkout.' },
        { path: 'components/admin/coupon-manager.tsx', purpose: 'Promotions tab — Stripe coupon CRUD.' },
        { path: 'components/admin/stripe-products.tsx', purpose: 'Product catalog editor — plans, addons, TLDs.' },
        { path: 'components/admin/onboarding-controls.tsx / onboarding-progress.tsx', purpose: 'Internal onboarding pipeline UI.' },
        { path: 'components/admin/ticket-reply-form.tsx / ticket-sidebar.tsx', purpose: 'Ticket detail page UI.' },
        { path: 'components/admin/admin-error-logs.tsx', purpose: 'Filterable log viewer.' },
        { path: 'components/admin/affiliate-referral-card.tsx', purpose: 'Shown on the admin home for affiliate-role users.' },
      ]},
      { label: 'Studio components', files: [
        { path: 'components/studio/studio-tool.tsx (in admin route)', purpose: 'Top-level Studio orchestrator — owns brief, options, businessInfo, styleConfig (incl. customHtmlBlocks toggle).' },
        { path: 'components/studio/step-brief.tsx', purpose: 'Brief step — site description, business info, social, page list, HTML reference upload.' },
        { path: 'components/studio/step-design.tsx', purpose: 'Design step — page sidebar (categorized), preview iframe, prompt bar, Global Styles, Site Settings drawer, collapsible Sections panel with inline edit.' },
        { path: 'components/studio/step-export.tsx', purpose: 'Export step — WXR builder + conditional child theme zip download in Full Custom mode.' },
      ]},
      { label: 'Other component groups', files: [
        { path: 'components/billing/*', purpose: 'Customer-facing billing widgets.' },
        { path: 'components/checkout/*', purpose: 'Get-started checkout pieces.' },
        { path: 'components/domains/*', purpose: 'Domain search + cart.' },
        { path: 'components/sites/*', purpose: 'Customer site dashboard widgets.' },
        { path: 'components/marketing/*', purpose: 'Homepage / pricing / features sections.' },
      ]},
    ],
  },

  {
    id: 'db',
    title: 'supabase/migrations — schema',
    icon: Database,
    reasoning:
      'Migrations are append-only, numbered, and never edited after merge. A new column always means a new migration even if the table is hours old. We keep one logical change per file so a rollback is targeted. RLS policies that exist are mostly disabled at the table level — auth happens in services/* — but a few tables (logs, public.profiles read) keep policies as defense in depth.',
    groups: [
      { label: 'Core tables', files: [
        { path: 'migrations/0001_init.sql', purpose: 'users, sites, domains, products, subscriptions, invoices, logs.' },
        { path: 'migrations/0002+ profile / role columns', purpose: 'Roles, company_name, timezone, stripe_customer_id added incrementally.' },
        { path: 'migrations/000X_partner_program.sql', purpose: 'partners, partner_clients, commissions tables.' },
        { path: 'migrations/000X_studio_drafts.sql', purpose: 'studio_drafts table — saved Studio sessions per user.' },
        { path: 'migrations/000X_tickets.sql', purpose: 'tickets + ticket_messages with type column (studio/support/onboarding/sales).' },
        { path: 'migrations/000X_addons.sql', purpose: 'plan_addon product type for per-site Stripe sub-items (bursting, WAF).' },
        { path: 'migrations/000X_credits.sql', purpose: 'Credit pools + ledger for the AI metering system.' },
        { path: 'migrations/000X_intake_phone.sql', purpose: 'Intake form fields + Twilio number ownership.' },
      ]},
    ],
  },

  {
    id: 'public-and-claude',
    title: 'public/ and .claude/',
    icon: GitBranch,
    reasoning:
      'public/ is just static assets. .claude/ holds Claude Code configuration: project memory, slash commands, agent prompts. It\'s checked in deliberately so the team\'s automation context is shared rather than per-developer.',
    groups: [
      { label: 'Static + config', files: [
        { path: 'public/assets/*', purpose: 'Logos, favicons, marketing imagery.' },
        { path: '.claude/projects/*', purpose: 'Per-project Claude Code memory + transcripts.' },
        { path: '.claude/commands/*', purpose: 'Custom slash commands (deploy, migrate, etc).' },
      ]},
    ],
  },
];

export function RepoDocs() {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map(s => [s.id, s.id === 'arch']))
  );
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SECTIONS;
    return SECTIONS
      .map(sec => ({
        ...sec,
        groups: sec.groups
          .map(g => ({ ...g, files: g.files.filter(f =>
            f.path.toLowerCase().includes(needle) || f.purpose.toLowerCase().includes(needle)
          )}))
          .filter(g => g.files.length > 0),
      }))
      .filter(sec =>
        sec.groups.length > 0 ||
        sec.title.toLowerCase().includes(needle) ||
        sec.reasoning.toLowerCase().includes(needle)
      );
  }, [q]);

  const totalFiles = SECTIONS.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.files.length, 0), 0);

  return (
    <div>
      {/* Intro */}
      <div className="card p-5 mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Repository documentation</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Hand-curated tour of every meaningful file in this codebase, grouped by architectural concern.
          Each section starts with the <em>reasoning</em> behind that grouping — why those files live
          together and what the trade-offs were — followed by a one-line purpose for each file.
          {totalFiles} file entries across {SECTIONS.length} architectural areas.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search files or descriptions…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-transparent"
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filtered.map(sec => {
          const isOpen = !!open[sec.id] || !!q.trim();
          const Icon = sec.icon;
          return (
            <div key={sec.id} className="card overflow-hidden">
              <button
                onClick={() => setOpen(o => ({ ...o, [sec.id]: !o[sec.id] }))}
                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <Icon className="w-4 h-4 text-admin-600" />
                <span className="text-sm font-semibold text-gray-900">{sec.title}</span>
                <span className="ml-auto text-[11px] text-gray-400">
                  {sec.groups.reduce((n, g) => n + g.files.length, 0)} files
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="my-4 px-4 py-3 rounded-lg bg-blue-50/50 border border-blue-100">
                    <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Reasoning</p>
                    <p className="text-xs text-blue-900 leading-relaxed">{sec.reasoning}</p>
                  </div>

                  {sec.groups.map(g => (
                    <div key={g.label} className="mb-4 last:mb-0">
                      <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{g.label}</h3>
                      <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                        {g.files.map(f => (
                          <div key={f.path} className="px-3.5 py-2.5 hover:bg-gray-50/50">
                            <code className="text-[12px] font-mono text-admin-700 break-all">{f.path}</code>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{f.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-8 text-center text-sm text-gray-400">No files match "{q}".</div>
        )}
      </div>
    </div>
  );
}
