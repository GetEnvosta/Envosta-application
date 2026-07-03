# AUDIT.md — Phase 0 (read-only) · 2026-07-03

Audit of the existing Envosta codebase against charter Rev 1.4
(`CLAUDE.md` at repo root). Branch: `rebuild`. Production (`main` →
my.envosta.com/envosta.com via Vercel) is live with paying customers and is
not modified by this rebuild until the Phase 8 cutover.

The existing codebase implements the **previous business model**: generic
self-serve managed WordPress hosting (plans Minimum/Standard/Growth/Enterprise
priced in CAD+USD), per-site Stripe subscriptions, self-serve checkout with
trials, domain sales, add-ons, resellers (50% coupon), Jetpack partner
licensing, and a large customer + admin dashboard. Essentially every
customer-facing surface predates the charter and needs rework or deprecation;
a large share of the infrastructure plumbing is directly reusable.

---

## 1. Stack inventory

| Layer | What's there |
|---|---|
| Framework | Next.js **15.5** App Router, React **19**, TypeScript 5.7, `src/` layout with route groups `(marketing)` and `(app)` |
| Styling | Tailwind CSS 3.4 (dashboard) + hand-rolled `marketing.css` design system (dark navy/gold marketing site), Inter font, lucide-react icons |
| Data | **Supabase** (production project): Postgres + Auth (`@supabase/ssr` cookie sessions) + RLS; service-role (`SUPABASE_SECRET_KEY`) used across API routes; `stripe.*` schema mirrored read-only by **Stripe Sync Engine** |
| Payments | **Stripe** (`stripe` v20): per-site subscriptions, embedded checkout, SetupIntent trials, webhooks (`src/app/api/webhooks/stripe/route.ts`, sig-verified), domain renewals charged via off-session PaymentIntents from a daily cron |
| Registrar | **OpenSRS/Tucows** XML API client (`src/lib/integrations/opensrs.ts`) — live creds, IP-allowlisted, register/transfer/renew/DNS/auto-renew/lock, plus `opensrs_domains` mirror + reconcile cron |
| Hosting API | **wp.cloud Atomic API** client (`src/lib/integrations/wpcloud.ts`) — working endpoints for site create/delete/suspend, meta (workers/memory/quota), edge cache, defensive mode, SSH/SFTP users, error logs, WP-CLI; only callable from whitelisted Vercel IPs |
| Jetpack | Jetpack Start partner API (`src/lib/integrations/jetpack.ts`) — **banned by the charter**, must be stripped |
| Email | **Resend** (`src/lib/email.ts`) with branded transactional templates |
| Jobs | **Vercel crons** (9, see `vercel.json`): health-check, cleanup-unclaimed, retry-stuck-provisions, delete-expired-sites, cleanup-abandoned-signups, process-domain-renewals, reconcile-wpcloud, reconcile-opensrs, drift-alerter; `workflow` + `@vercel/queue` for durable workflows (`src/app/workflows/*`: register-domain, renew-domain, cancel-domain-renewal) |
| Deploy | **Vercel**, auto-deploy from `main`. Middleware gates only `/dashboard` + `/admin` |
| Analytics | `@vercel/analytics` + Speed Insights (first-party — charter-compatible; no client-visible third-party dashboards) |
| Forms | Plain React forms → `/api/contact` (rate-limited, HTML-escaped) → tickets + Resend email. **No Turnstile yet** (charter requires it) |
| Anti-abuse | `src/lib/rate-limit.ts` (in-memory), internal routes gated by `X-Internal-Token` |

**Env vars in use (`src/`):** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`, `OPENSRS_USERNAME`, `OPENSRS_API_KEY`,
`OPENSRS_HOST`, `WPCLOUD_API_KEY`, `WPCLOUD_BASE_URL`, `WPCLOUD_CLIENT`,
`JETPACK_PARTNER_ID`, `JETPACK_PARTNER_SECRET` (banned-stack),
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_ALERT_EMAIL`, `CRON_SECRET`,
`INTERNAL_API_TOKEN`, `RESELLER_DISCOUNT_PERCENT` (banned-mechanism),
`DOMAIN_RENEWAL_WINDOW_DAYS`, `ENVOSTA_PARENT_THEME_ZIP_URL`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NODE_ENV`.

New handoff modules additionally expect: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`,
`APP_URL`, `SELF_SERVE_ENABLED`, `PROVISIONING_DRY_RUN`, `OPENSRS_ENV`,
`WPCLOUD_API_BASE`, `WPCLOUD_API_TOKEN`, `WPCLOUD_NAMESERVERS`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `UPTIME_PROVIDER`,
`UPTIME_API_KEY` (naming unification is a Phase 6 integration task).

## 2. Page & route map

165 page/route files enumerated. Verdicts are advisory inputs to Phase 1
(deprecate-before-delete); nothing moves in this phase.

### Marketing pages (src/app/(marketing))

| Path | What it is/does | Verdict |
|------|-----------------|---------|
| / | Homepage hero, value prop, testimonials, architecture/infra story, FAQ | REWORK |
| /plans | Pricing cards, monthly/yearly toggle, feature matrix | REWORK |
| /pricing | Primary plans display (current ladder: Minimum/Standard/Growth/Enterprise) | REWORK |
| /get-started | Self-serve signup flow — account + plan + embedded Stripe checkout | REWORK |
| /products | Feature showcase page (site builder, SEO, reviews, forms, reports) | REWORK |
| /resellers | Agency-focused landing with lead form; 50%-off volume pricing | DEPRECATE |
| /buy-domain | Standalone domain search + registration checkout | REWORK |
| /domains | Domain marketplace with TLD listing and availability check | REWORK |
| /onboarding | Journey explainer page (sign → Studio → live → optimize) | REWORK |
| /method | How Envosta works — tech stack narrative, automation spine | REWORK |
| /contact | Enterprise/sales inquiry form page (fires /api/contact) | REWORK |
| /support | Support + SLA promises landing page | KEEP |
| /intake | Sales-rep intake form (industry, project type, budget, plan) | REWORK |
| /careers | Recruiting page | NEUTRAL |
| /blog, /blog/[slug] | Blog listing and detail pages | NEUTRAL |
| /legal/{terms,privacy,gdpr,cookies} | Legal pages | NEUTRAL |

### Auth routes

| Path | What it is/does | Verdict |
|------|-----------------|---------|
| /auth/login | Email/password login | KEEP |
| /auth/signup | Redirects to /get-started | REWORK |
| /auth/forgot-password, /auth/reset-password | Password reset | KEEP |
| /auth/claim | Unclaimed-account activation flow | KEEP |
| /auth/callback, /auth/signout | Supabase session handlers | KEEP |

### Customer dashboard (src/app/(app)/dashboard)

| Path | What it is/does | Verdict |
|------|-----------------|---------|
| /dashboard | Main dashboard — sites, domains, subscription status | KEEP |
| /dashboard/add-site | Add site flow with plan selection (self-serve) | REWORK |
| /dashboard/sites, /sites/[id] | Site list + detail (status, plan, billing, actions) | KEEP |
| /dashboard/domains, /domains/[id] | Domain list + detail (DNS, renewal, transfer) | KEEP |
| /dashboard/domains/register | Standalone domain registration checkout | REWORK |
| /dashboard/billing | Invoices, payment methods, Stripe portal link | KEEP |
| /dashboard/tickets{,/new,/[id]} | Support tickets (the intake loop skeleton) | KEEP |
| /dashboard/settings | Account settings | KEEP |
| /dashboard/activate | Post-signup activation (domain selection, go-live) | REWORK |
| /transfer/accept | Accept site handoff from another customer | KEEP |

### Admin pages (src/app/(app)/admin)

| Path | What it is/does | Verdict |
|------|-----------------|---------|
| /admin | KPI dashboard (users, activity, tickets) | KEEP |
| /admin/audit, /admin/logs | Audit log + API call log viewers | KEEP |
| /admin/customers{,/[id]} | Customer list/detail incl. impersonation | KEEP |
| /admin/sites/cleanup | Orphan-site cleanup tool | KEEP |
| /admin/domains{,/[id],/pricing} | Domain admin + TLD pricing editor | KEEP |
| /admin/billing{,/invoice/new} | Invoices + manual invoice creation | KEEP |
| /admin/subscriptions | Subscription list (Sync Engine mirror) | KEEP |
| /admin/emails, /admin/diagnostics | Email testing, connectivity tests | KEEP |
| /admin/plans, /admin/reporting | Plan reference; MRR/churn/CAC/gate metrics | KEEP |
| /admin/blogs{,/new,/[id]/edit} | Blog management | NEUTRAL |
| /admin/tickets{,/new,/[id]} | Ticket admin | KEEP |
| /admin/settings | Settings hub | KEEP |
| /admin/settings/plans{,/new,/[id]} | Plan CRUD editor | DEPRECATE (plans become frozen config) |
| /admin/settings/products, /admin/products/** | Product/price management + Stripe sync | REWORK |
| /admin/settings/addons | Per-site add-on manager | DEPRECATE |
| /admin/settings/promotions | Promotion/discount management | DEPRECATE (coupons banned) |
| /admin/settings/services | Old services model | DEPRECATE |
| /admin/settings/social | Social links manager | NEUTRAL |
| /admin/settings/{emails,integrations,crons,tlds} | Email/integration/cron/TLD config | KEEP |

### API — public (src/app/api)

| Path | What it is/does | Verdict |
|------|-----------------|---------|
| POST /api/create-subscription | Self-serve per-site Stripe subscription + trials + promo codes | REWORK |
| POST /api/create-site | Logged-in add-site (site row + per-site sub) | REWORK |
| POST /api/domain-checkout, /api/domain-only-checkout | One-time domain purchase checkouts | REWORK |
| GET /api/domains, /api/domain-check | Domain availability/search | KEEP |
| GET /api/hosting-plans | Plan fetch for pickers | REWORK |
| POST /api/account/addons/{add,remove} | Site add-on attach/detach | DEPRECATE |
| POST /api/upgrade-site | Plan upgrade/downgrade | REWORK |
| POST /api/reactivate-site | Reactivate cancelled site (new sub) | KEEP |
| POST /api/site-transfer/{initiate,accept} | Customer-to-customer site handoff | KEEP |
| POST /api/site-actions | Owner/staff site actions incl. SFTP, logs, cache | KEEP |
| GET /api/site-guardrails | Resource guardrails (bursting gate) | KEEP |
| GET /api/billing-portal, /api/payment-methods | Stripe portal + PM list | KEEP |
| POST /api/contact | Contact → ticket + sales email | KEEP |
| POST /api/intake | Rep intake form handler | REWORK |
| GET /api/health | Health check | NEUTRAL |
| POST /api/stop-impersonation, /api/auth/claim | Session utilities | KEEP |

### API — internal (X-Internal-Token)

| Path | Verdict |
|------|---------|
| /api/internal/opensrs/{register-domain,set-dns,set-whois-privacy,set-auto-renew,registrar-lock} | KEEP |
| /api/internal/wpcloud/{provision-site,site-info} | KEEP (strip Jetpack license step) |

### API — admin

All ~40 admin endpoints classified KEEP except:
| Path | Verdict |
|------|---------|
| /api/admin/coupons (GET/POST) | DEPRECATE (coupons banned) |
| /api/admin/set-reseller | DEPRECATE |
| /api/admin/jetpack-provision | DEPRECATE (Jetpack banned) |
| /api/admin/custom-subscription | REWORK (off-ladder pricing conflicts with frozen plans) |
| /api/admin/create-product, sync-stripe, products/[id]/* | REWORK (product catalog becomes frozen config) |

Notable KEEPs: create-user, create-unclaimed-account, create-site,
provision-site, site-bootstrap, register-domain, reinstall-site,
transfer-site, charge-customer, custom-invoice, refund-invoice,
sync-customer, assign-site-owner, assign-domain-owner, reapply-plan-resources,
run-cron, cron-toggle, connectivity-test, drift/[id]/resolve, sync-check,
test-email, sync-tld-pricing, update-tld-price.

### API — crons (all KEEP)

health-check · cleanup-abandoned-signups · cleanup-unclaimed ·
delete-expired-sites · process-domain-renewals · reconcile-opensrs ·
reconcile-wpcloud · retry-stuck-provisions · drift-alerter

### Webhooks

| Path | What it is/does | Verdict |
|------|-----------------|---------|
| POST /api/webhooks/stripe | Sig-verified event handler: provisions sites, cascades sub status, domain registration kick-off | KEEP (rework event logic to new model at integration) |

### Workflows (src/app/workflows — all KEEP)

provision-site · register-domain · cancel-site · suspend-site ·
unsuspend-site · renew-domain · cancel-domain-renewal · update-dns ·
update-site-plan · notify-client

### Key shared libs (src/lib)

| Module | Purpose | Verdict |
|--------|---------|---------|
| stripe-subscription.ts | Per-site sub helpers + reseller coupon | REWORK |
| stripe-admin.ts | Product/price sync + coupon management | REWORK |
| supabase-server/browser.ts, roles.ts, audit.ts, email.ts | Auth/audit/email core | KEEP |
| integrations/opensrs.ts | Registrar client | KEEP |
| integrations/wpcloud.ts | Hosting client (proven endpoints) | KEEP |
| integrations/jetpack.ts | Jetpack partner API | DEPRECATE (banned) |
| reseller.ts | 50% reseller coupon logic | DEPRECATE (banned) |
| addon-effects.ts | Add-on resource effects | DEPRECATE |
| site-transfer.ts, site-settings.ts, crons.ts, rate-limit.ts, internal-auth.ts, provision-status.ts, api-call-logger.ts, sanitize.ts, utils.ts, fx.ts | Infra utilities | KEEP |
| social-platforms.ts | Social links catalog | NEUTRAL |

### Verdict totals

| Verdict | Count |
|---------|-------|
| KEEP | 96 |
| REWORK | 27 |
| DEPRECATE | 31 |
| NEUTRAL | 11 |
| **Total** | **165** |

## 3. Violation list (vs charter Rev 1.4)

Swept `src/`, `supabase/`, `public/`, root config (governance files from
Step 0 excluded). Categories ordered by severity.

### 3.1 Jetpack — banned entirely (must-purge)

15+ files, 50+ occurrences. The full partner-licensing integration shipped
recently and must be stripped:
- `src/lib/integrations/jetpack.ts` — partner API module (entire file)
- `src/app/api/admin/jetpack-provision/route.ts` — admin endpoint (entire file)
- `src/app/api/internal/wpcloud/provision-site/route.ts:241,256,470,530-557` — license attach + plugin removal + attribution stamping
- `src/app/api/internal/wpcloud/site-info/route.ts:54-56,272-276` — backup/WAF/plugin logic
- `src/lib/addon-effects.ts` (11 refs) — jetpack_backup/cdn/waf effect keys
- `src/components/sites/site-addons.tsx:21-45` — "Jetpack Backup/CDN/WAF" UI
- `src/components/admin/jetpack-status.tsx` — admin license panel (entire file)
- `src/app/(app)/admin/services/[id]/page.tsx:9,167` — JetpackStatus embed
- `src/app/api/account/addons/{add,remove}/route.ts` — tier provision/revert
- `src/app/api/upgrade-site/route.ts:150-152`, `src/app/workflows/update-site-plan.ts:244-246` — backup/WAF meta
- `src/app/(app)/admin/diagnostics/observability-tabs.tsx:68` — provider list
- `docs/architecture-audit.md` (8 refs) — stale docs
- `.claude/settings.local.json:106-141` — Jetpack API permission entries
- Plan metadata in production DB (`products.metadata.jetpack_plan_slug`) — data-side cleanup at cutover

### 3.2 Discount/coupon code paths — banned (must-purge)

"No coupon or discount-code code paths may exist" (charter §7):
- `src/lib/reseller.ts` — creates a forever 50% Stripe coupon (`RESELLER_DISCOUNT_PERCENT`), applied to every reseller site sub
- `src/app/api/admin/set-reseller/route.ts` + `src/components/admin/reseller-toggle.tsx` — flag + UI
- `src/app/api/admin/coupons/` — coupon list/create endpoints
- `/admin/settings/promotions` — promo management UI
- `promoCode` accepted by `src/app/api/create-subscription/route.ts`
- Annual billing implemented as ~25%-off yearly prices (charter allows only "13th month free" bonus-month framing)

### 3.3 Legacy names from the charter's banned list (must-purge)

- `src/components/marketing/design-packages.tsx:26,33-34` — **"Studio Lite"** and **"Studio Premium"** ($15,000) packages (also agency/studio positioning, §3.6)
- No hits for: $49/$132/$517 plans, "Booked", "Booked+", "Market Leader", "Floor" (already gone)

### 3.4 Plan ladder mismatch (rework)

Current model's plans contradict the frozen ladder everywhere they surface:
- `src/app/(marketing)/plans/page.tsx` — `CORE_SLUGS=['minimum','standard','growth']` + `enterprise` card ($2,300/mo "starting at"), features hardcoded per slug
- Production `products` table: Minimum $36 / Standard / Growth / Enterprise in CAD+USD with yearly prices — different names, prices, contents than Basic $297 / Business $597 / Growth $3,472
- `src/app/(marketing)/intake/page.tsx`, admin plan editor, custom-subscription form — all speak the old ladder
- Old seed migration only covers the old plans

### 3.5 Trials + self-serve (rework — model conflict)

- 14-day free trial pervasive: `get-started-flow.tsx`, `dashboard/activate`, plans page ("Try free for 14 days"), dashboard trial banners. Charter has no trials.
- Self-serve checkout is the primary flow today (`create-subscription`, embedded checkout, site-checkout-flow); charter allows self-serve only post–Gate 3 behind `SELF_SERVE_ENABLED=false`.
- Per-site subscription billing throughout (add-ons as SubscriptionItems, one sub per site); the new schema models **one plan per client**. Billing-granularity migration is an integration decision (flagged, not unilaterally resolved).

### 3.6 Agency/studio positioning (rework)

- `src/components/marketing/design-packages.tsx` — sells standalone design packages ("Studio" offers) — conflicts with hosting-first category
- `/resellers` page — "agency-focused" copy is about *customers'* agencies (not Envosta self-description) but the reseller program itself is banned mechanics (§3.2); page deprecates
- No occurrences of Envosta self-described as "agency/web design company/marketing company" in client-facing copy

### 3.7 Clean categories (no violations found)

- **Forbidden claims:** no ranking/lead/revenue guarantees, no "#1 on Google", no PPC/ads copy. Existing "99.99% uptime guarantee" + 14-day refund in ToS are legitimate SLA/refund language (ToS gets rewritten anyway per Open Question #4).
- **Fake scarcity/testimonials:** none found (marketing testimonials section exists on homepage — verify real vs placeholder during Phase 2 and mark `<!-- PROOF: pending real client data -->` where unproven).
- **Domain lock-in:** none — current implementation already registers domains in the client's name and honors transfer-out.

### 3.8 Summary

| Category | Scope | Severity |
|----------|-------|----------|
| Jetpack | 15+ files | must-purge |
| Coupons/discounts (reseller 50%, promos, yearly %-off) | 6+ surfaces | must-purge |
| "Studio Lite/Premium" packages | 1 component | must-purge |
| Plan ladder (standard/enterprise, CAD prices, trials, self-serve-first) | all plan surfaces | rework |
| Per-site billing granularity vs one-plan-per-client | billing layer | integration decision |
| Agency positioning | design-packages + resellers | rework/deprecate |
| Forbidden claims / fake scarcity / domain lock-in | — | clean |

## 4. Reusable assets

**Directly reusable (KEEP-class):**
- `src/lib/integrations/wpcloud.ts` — proven wp.cloud client with real,
  working endpoint paths (supersedes the `VERIFY` guesses in the handoff's
  `lib/wpcloud.ts`; fold together at Phase 6).
- `src/lib/integrations/opensrs.ts` + domain workflows + `reconcile-opensrs`
  cron — battle-tested registrar layer incl. transfer-out support (charter's
  "client owns, Envosta operates" is already the implemented posture:
  registrant = client, transfer-out honored).
- Stripe plumbing: webhook signature handling, Sync Engine mirror pattern,
  `stripeAdmin()` read-only accessor, off-session charge pattern from
  `process-domain-renewals`.
- Supabase auth stack (`supabase-server/browser`, middleware), audit log
  (`src/lib/audit.ts`), api-call logger with secret redaction, email layer,
  rate limiting, internal-token route pattern, drift-alerter + reconcile-cron
  architecture (mirror tables written only by sync code).
- Admin dashboard skeleton (layout, role gating via `users.role`, tickets
  system = a working intake loop to power the Service Promise).
- Ops tooling: health-check, retry-stuck-provisions, cleanup crons.

**Rework-class:** marketing shell (nav/footer/layout structure), contact →
ticket funnel (needs Turnstile + new brand), plans/checkout surfaces (new
ladder + rep-assisted), provisioning pipeline (site create flow becomes the
charter §4 spine with Studio build + GBP + monitoring steps).

**Not reusable (model-bound):** per-site subscription lifecycle, add-ons,
trials, reseller discount machinery, Jetpack integration, credits/partner
program remnants, Enterprise sales funnel, current pricing pages/copy,
current brand look (navy/gold "quiet dark" ≠ charter's blueprint
navy/amber/Archivo/IBM Plex Mono system — close family, but §5 is specific).

## 5. Risk notes (live wiring the rework could break)

1. **`main` auto-deploys production.** Any merge/push to `main` ships to
   envosta.com/my.envosta.com immediately. All rebuild work stays on
   `rebuild`; cutover only via Phase 8 checklist. Root `app/`+`lib/` from
   Step 0 intentionally break `next build` on this branch (Next prefers root
   `app/` over `src/app`) — do not merge until integration resolves placement.
2. **Live customers on the old model:** 2 active sites (kelly-bishop,
   ranch-hacks) each on a live per-site Stripe subscription, plus
   `ranchhacks.ca` with auto-renew. The daily `process-domain-renewals` cron
   charges real cards off-session. Deleting/renaming products, webhooks, or
   cron routes on cutover without a migration plan breaks real billing.
   (See OPEN_QUESTIONS #8/#9.)
3. **Known pre-existing defect (do not lose):** `ranchhacks.ca` was
   transferred in with OpenSRS-side `auto_renew=1` while the local cron also
   renews → double-renewal race. Fix belongs to the transfer-in path
   (force OpenSRS auto-renew off, as registration already does).
4. **`stripe.*` schema is a read-only Sync Engine mirror** — nothing may ever
   write to it; the new `stripe_*` mirror tables in `0001_init.sql` are a
   separate, app-owned pattern (dev project only).
5. **Production Supabase must not receive `0001_init.sql`** — colliding
   table names (`domains`, `sites`) with live data. Dev project only
   (OPEN_QUESTIONS #6).
6. **wp.cloud + OpenSRS are IP-allowlisted to Vercel** — integration code
   cannot be exercised from local dev; dry-run modes + deploy-time
   verification are mandatory (the handoff's `PROVISIONING_DRY_RUN` pattern).
7. **Secrets in Vercel env** (Stripe live keys, OpenSRS key, wp.cloud key,
   Supabase service key, Resend). Never rotate/rename casually; `.env.example`
   was replaced in Step 0 — old var names still power production code on
   `main`.
8. **Repo lives inside OneDrive** — sync can yank/restore files mid-build
   (observed in-session). Consider excluding `.next/` + `node_modules/` from
   sync or relocating the working copy (parked in OPEN_QUESTIONS "Proposed").
9. **Emails:** Resend sends from envosta.com domain; new funnel sequences
   (Soap Opera etc.) must not break existing transactional sends used by
   live flows.
