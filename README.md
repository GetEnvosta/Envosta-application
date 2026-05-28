# Envosta — WordPress Hosting Platform

Web application for Envosta hosting platform. Customer dashboard + admin panel.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS (deployed on Vercel)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe Checkout + Billing (mirrored to `stripe.*` schema via Supabase Stripe Sync Engine)
- **Hosting**: WP.cloud Atomic API (managed via `/api/internal/wpcloud/*`)
- **Domains**: OpenSRS XML API (managed via `/api/internal/opensrs/*`)
- **Email**: Resend
- **Orchestration**: Vercel Workflows SDK (`'use workflow'` / `'use step'`)
- **Outbound networking**: Vercel Static IPs (whitelisted at wp.cloud + OpenSRS)

## Project Structure

```
envosta-application/
├── src/                    # Next.js app (deployed to Vercel)
│   ├── app/
│   │   ├── (app)/          # Auth-gated routes (customer dashboard + admin)
│   │   ├── (marketing)/    # Public site (pricing, plans, blog, resellers)
│   │   ├── api/
│   │   │   ├── account/    # Customer-facing (subscriptions, addons)
│   │   │   ├── admin/      # Admin-only mutations
│   │   │   ├── cron/       # Vercel-scheduled tasks (CRON_SECRET-gated)
│   │   │   ├── internal/   # Service-to-service (INTERNAL_API_TOKEN-gated)
│   │   │   ├── webhooks/   # Stripe webhook (signature-verified)
│   │   │   └── workflows/  # Vercel Workflows entrypoints
│   │   └── workflows/      # 'use workflow' definitions
│   ├── components/         # React components
│   ├── lib/                # Helpers (audit, sanitize, supabase clients, etc.)
│   ├── services/           # Read-only data fetchers
│   └── middleware.ts       # Security headers + auth route gating
├── supabase/
│   ├── migrations/         # Sequential SQL migrations
│   └── config.toml         # Local supabase config (no Edge Functions used)
└── .env.example            # Required env vars (never commit .env*)
```

## Setup

1. Clone this repo
2. Copy `.env.example` to `.env.local` and fill in your real keys
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Deployment

- **Vercel**: Connected to this repo. Auto-deploys `src/` on push to `main`. Production has CRON_SECRET, INTERNAL_API_TOKEN, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, WPCLOUD_API_KEY, OPENSRS_USERNAME + KEY env vars set.
- **Supabase**: Migrations applied via `supabase db push` from a developer's local CLI. No GitHub Action involved.

## Architecture Notes

- **Account-centric billing.** One Stripe Subscription per customer. Plan = main line item. Add-ons = additional Stripe items with `quantity` = number of sites using that add-on type. Per-site rows live in `public.site_addons`.
- **Mirror tables.** `wpcloud_sites`, `opensrs_domains`, `opensrs_contacts`, `opensrs_dns_records` reflect upstream provider state. Reconcile crons run hourly (wp.cloud) and daily (OpenSRS), writing drift to `sync_drift` which feeds the every-6h alerter email.
- **Workflows.** Durable multi-step ops (provision, cancel, suspend, renew domain) live in `src/app/workflows/`. Each caller uses `try { start(workflow, ...) } catch { /* inline fallback */ }` so a misconfigured runtime never strands a transition.
- **Security.** Cron routes fail-closed if `CRON_SECRET` is unset. Internal routes require `verifyInternalToken()`. All `.or()` user-input is passed through `sanitizeSearchQuery()`. All outbound HTML email escapes user fields via `escapeHtml()`. `domains` mutations route through `authzDomainOwnership()`.
