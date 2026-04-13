# Envosta — WordPress Hosting Platform

Web application for Envosta hosting platform. Customer dashboard + admin panel.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS (deployed on Vercel)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Payments**: Stripe Checkout + Billing
- **Hosting**: WP.cloud API
- **Domains**: eNom API

## Project Structure

```
envosta-application/
├── src/                    # Next.js app (deployed to Vercel)
│   ├── app/                # Pages (App Router)
│   │   ├── auth/           # Login, signup, forgot password
│   │   ├── dashboard/      # Customer dashboard
│   │   └── admin/          # Admin panel
│   ├── components/         # React components
│   ├── lib/                # Supabase clients, utilities
│   └── middleware.ts       # Auth route protection
├── supabase/               # Supabase (deployed via GitHub Actions)
│   ├── migrations/         # SQL schema + RLS policies
│   └── functions/          # Edge Functions (Stripe, WP.cloud, eNom)
├── .github/workflows/      # CI/CD pipeline
└── .env.local              # Environment variables (never committed)
```

## Setup

1. Clone this repo
2. Copy `.env.local` and fill in your real keys
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Deployment

- **Vercel**: Connected to this repo. Auto-deploys `src/` on push to `main`.
- **Supabase**: GitHub Action auto-deploys `supabase/` on push to `main`.
