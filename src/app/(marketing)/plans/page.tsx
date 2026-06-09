import type { Metadata } from 'next';
import PricingClient from './pricing-client';
import { createClient } from '@/lib/supabase-server';
import { DesignPackages } from '@/components/marketing/design-packages';

export const metadata: Metadata = {
  title: 'Hosting Plans — Envosta Managed WordPress Hosting',
  description: 'Managed WordPress hosting plans. Pick the foundation that fits — every plan starts with a personal consultation.',
  alternates: { canonical: 'https://envosta.com/plans' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'Managed WordPress hosting with personal onboarding, AI tools, and free SSL, CDN, and backups on every plan.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Managed WordPress hosting with personal onboarding, AI tools, and the essentials baked in.',
  },
};

// Re-render whenever the underlying products change. 60s is plenty for a
// public marketing page and avoids hammering Supabase on every visit.
export const revalidate = 60;

interface HostingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_usd: number | null;
  price_yearly_usd: number | null;
  price_cad: number | null;
  price_yearly_cad: number | null;
  sort_order: number | null;
  features: string[] | null;
  metadata: any;
}

function dollars(cents: number | null | undefined): string {
  if (!cents) return '0';
  return Math.round(cents / 100).toString();
}

/** Annual displayed as a per-month equivalent (yearly / 12). */
function annualMonthly(yearlyCents: number | null | undefined): string {
  if (!yearlyCents) return '0';
  return Math.round(yearlyCents / 12 / 100).toString();
}

/** % savings of yearly vs (monthly * 12). */
function annualSavings(monthly: number | null, yearly: number | null): number | null {
  if (!monthly || !yearly) return null;
  const fullYear = monthly * 12;
  if (yearly >= fullYear) return null;
  return Math.round(((fullYear - yearly) / fullYear) * 100);
}

function check() {
  return (
    <span className="ck-wrap">
      <svg className="ck" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * Hardcoded feature bullets per plan slug. Each tier deliberately shows
 * what's gained at that level — universal essentials (SSL, CDN, daily
 * backups, WAF, uptime SLA, free migration) live in the bottom grid and
 * are NOT repeated here, so each card reads as a clear value-add.
 */
const FEATURES_BY_SLUG: Record<string, string[]> = {
  // — MINIMUM —
  minimum: [
    '25 GB SSD storage',
    '3 PHP workers',
    'Email support · 24-hr response',
    'Self-serve admin dashboard',
    '1-click plugin & theme installs',
    'WordPress core + plugin auto-updates',
  ],

  // — STANDARD (inherits Minimum) —
  standard: [
    'Everything in Minimum',
    '50 GB SSD storage + 5 PHP workers',
    'Guided onboarding call (60 min)',
    'Priority support · 4-hr response',
    'WooCommerce-ready provisioning',
    'Lead capture forms + Google Analytics',
    'Monthly performance & SEO report',
  ],

  // — GROWTH (inherits Standard) —
  growth: [
    'Everything in Standard',
    '100 GB SSD storage + 8 PHP workers',
    'Done-with-you concierge onboarding',
    'Dedicated account manager + 24/7 emergency line',
    'WooCommerce + subscriptions + Stripe integrations',
    'Quarterly site audits + strategy consultations',
  ],

  // — ENTERPRISE (custom-priced, inherits Growth) —
  enterprise: [
    'Everything in Growth',
    'Dedicated success team + private Slack channel',
    'White-glove onboarding + full site build',
    'Custom integrations + API access',
    'Custom resource scaling on request',
    'Priority roadmap input + quarterly strategy calls',
  ],
};

function getFeatures(plan: HostingPlan): string[] {
  // Prefer the admin-edited list from the catalog (products.features).
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    const fromDb = plan.features.filter((f): f is string => typeof f === 'string' && f.trim().length > 0);
    if (fromDb.length > 0) return fromDb;
  }
  // Fallback to the hardcoded list by slug/name (until a plan has its own).
  const slug = (plan.slug || '').toLowerCase();
  const name = (plan.name || '').toLowerCase();
  for (const key of Object.keys(FEATURES_BY_SLUG)) {
    if (slug.includes(key) || name.includes(key)) return FEATURES_BY_SLUG[key];
  }
  return [];
}

/** Slugs shown in the core 3-column pricing grid (order matters). */
const CORE_SLUGS = ['minimum', 'standard', 'growth'];

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: rawPlans } = await supabase
    .from('products')
    .select('id, name, slug, description, price_usd, price_yearly_usd, price_cad, price_yearly_cad, sort_order, features, metadata')
    .eq('type', 'hosting_plan')
    .eq('is_active', true);

  const allPlans: HostingPlan[] = ((rawPlans ?? []) as any[])
    .slice()
    .sort((a, b) => (a.price_usd ?? a.price_cad ?? 0) - (b.price_usd ?? b.price_cad ?? 0));

  // Split into core plans (Minimum / Standard / Growth) and Enterprise.
  // Reseller and anything else is hidden from the public pricing page.
  const plans = CORE_SLUGS
    .map((s) => allPlans.find((p) => p.slug === s))
    .filter(Boolean) as HostingPlan[];
  const premiumPlan = allPlans.find((p) => p.slug === 'enterprise') ?? null;

  // Standard is always the featured (middle) card.
  const featuredSlug = 'standard';

  // All plans shown in the comparison table (core + enterprise).
  const comparePlans = premiumPlan ? [...plans, premiumPlan] : plans;

  const overallSavings = (() => {
    const cheapest = plans[0];
    if (!cheapest) return null;
    return annualSavings(cheapest.price_usd ?? cheapest.price_cad ?? null, cheapest.price_yearly_usd ?? cheapest.price_yearly_cad ?? null);
  })();

  return (
    <>
      <PricingClient />

      <style>{`
        .pricing-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
        .pricing-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
        .pricing-hero .c{position:relative;z-index:1}
        .pricing-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-2px;line-height:1.12;margin-bottom:20px}
        .pricing-hero h1 em{font-style:normal;color:#fff;font-weight:500}
        .pricing-hero p{font-size:1.05rem;color:var(--t3);max-width:520px;margin:0 auto 44px;line-height:1.7;font-weight:300}
        .toggle-wrap{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:10px}
        .toggle-label{font-size:.88rem;color:var(--t2);font-weight:400;transition:color .2s}
        .toggle-label.active{color:var(--t1);font-weight:500}
        .toggle{width:52px;height:28px;background:var(--card2);border:1px solid var(--bdr2);border-radius:100px;cursor:pointer;position:relative;transition:background .3s}
        .toggle::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .3s}
        .toggle.on{background:var(--gold);border-color:var(--gold)}.toggle.on::after{transform:translateX(24px)}
        .save-badge{display:inline-block;background:rgba(34,197,94,.12);color:#22c55e;font-size:.7rem;font-weight:600;padding:3px 10px;border-radius:100px;margin-left:4px}
        .pricing-grid{padding:0 0 100px}
        .pricing-grid .c{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1200px;margin:0 auto;align-items:stretch}

        /* — Card shell — */
        .p-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:40px 36px 32px;position:relative;display:flex;flex-direction:column;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
        .p-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
        .p-card.featured{
          border-color:var(--gold);
          background:linear-gradient(180deg,rgba(37,99,235,.06),var(--card) 55%);
        }
        .p-card.featured::before{content:'Most Popular';position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;font-size:.66rem;font-weight:600;padding:5px 18px;border-radius:100px;letter-spacing:1px;text-transform:uppercase}

        /* — Header: balanced name + price hierarchy — */
        .p-card-name{font-size:1.5rem;font-weight:600;color:var(--t1);letter-spacing:-.5px;line-height:1.2;margin-bottom:14px}
        .p-card-price{display:flex;align-items:baseline;gap:4px;line-height:1;margin-bottom:6px}
        .p-card-price .currency{font-size:1.25rem;font-weight:500;color:var(--t1);letter-spacing:-.3px}
        .p-card-price .amount{font-size:2.85rem;font-weight:700;letter-spacing:-1.8px;line-height:1;color:var(--t1);font-variant-numeric:tabular-nums}
        .p-card-period{font-size:.84rem;color:var(--t3);font-weight:400;margin-top:8px;letter-spacing:.1px}
        /* Reserve the slot whether or not annual pricing is set, so cards
           with no yearly price don't shift their CTA up. */
        .annual-note-slot{min-height:28px;margin-top:10px;display:flex;align-items:center}
        .annual-note{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;color:#22c55e;font-weight:600;letter-spacing:.2px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:100px;padding:3px 10px;width:fit-content}
        .annual-note::before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#22c55e}

        /* Tagline locked to a fixed height (not min-height) so CTAs
           sit at the same vertical position across all three cards. */
        .p-card-tag{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.65;margin:24px 0 28px;height:5em;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}

        /* — CTA: outline on every plan, accent ramps with tier — */
        .p-card .p-cta{display:block;width:100%;text-align:center;padding:14px 24px;font-size:.9rem;font-weight:600;letter-spacing:.3px;border-radius:12px;background:transparent;border:1.5px solid var(--bdr2);color:var(--t1);text-decoration:none;transition:background .2s,border-color .2s,color .2s,transform .15s}
        .p-card .p-cta:hover{background:rgba(255,255,255,.03);border-color:var(--t2);color:#fff;transform:translateY(-1px)}

        /* — Divider + feature list — */
        .p-card-highlights{margin-top:32px;padding-top:28px;border-top:1px solid var(--bdr);flex:1;display:flex;flex-direction:column}
        .p-card-highlights-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:var(--t3);margin-bottom:16px}
        .p-card ul{list-style:none;margin:0;padding:0}
        .p-card li{display:flex;align-items:flex-start;gap:11px;font-size:.88rem;color:var(--t2);padding:8px 0;font-weight:400;line-height:1.5;border:none}
        .p-card li .ck-wrap{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:rgba(34,197,94,.12);display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
        .p-card li .ck{width:10px;height:10px;color:#22c55e}

        /* — Premium card (4th column, visually distinct) — */
        .premium-section{padding:0 0 100px}
        .premium-section .c{max-width:1200px;margin:0 auto}
        .premium-wrap{display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--card);border:1px solid var(--bdr);border-radius:20px;overflow:hidden;position:relative}
        .premium-wrap::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(37,99,235,.06),transparent 40%,transparent 60%,rgba(37,99,235,.04));pointer-events:none;z-index:0}
        .premium-info{padding:48px 44px;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center}
        .premium-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:var(--gold);margin-bottom:16px}
        .premium-info h3{font-size:clamp(1.8rem,3vw,2.4rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:16px;color:var(--t1)}
        .premium-info .premium-desc{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.7;margin-bottom:28px}
        .premium-starting{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:8px}
        .premium-price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:6px}
        .premium-price-row .currency{font-size:1.1rem;font-weight:500;color:var(--t1)}
        .premium-price-row .amount{font-size:2.6rem;font-weight:700;letter-spacing:-1.5px;color:var(--t1);font-variant-numeric:tabular-nums}
        .premium-period{font-size:.84rem;color:var(--t3);font-weight:400;margin-bottom:8px}
        .premium-annual-note{margin-bottom:28px;min-height:28px}
        .premium-cta{display:inline-flex;align-items:center;gap:10px;padding:14px 32px;font-size:.9rem;font-weight:600;letter-spacing:.3px;border-radius:12px;background:var(--gold);border:none;color:#fff;text-decoration:none;transition:background .2s,transform .15s;cursor:pointer}
        .premium-cta:hover{background:var(--gold-bright);transform:translateY(-1px)}
        .premium-cta svg{width:16px;height:16px}
        .premium-features{padding:48px 44px;border-left:1px solid var(--bdr);position:relative;z-index:1}
        .premium-features-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:var(--t3);margin-bottom:20px}
        .premium-features ul{list-style:none;margin:0;padding:0}
        .premium-features li{display:flex;align-items:flex-start;gap:11px;font-size:.88rem;color:var(--t2);padding:7px 0;font-weight:400;line-height:1.5}
        .premium-features li .ck-wrap{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:rgba(37,99,235,.12);display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
        .premium-features li .ck{width:10px;height:10px;color:var(--gold)}

        .all-plans{padding:0 0 100px}
        .all-plans-header{text-align:center;margin-bottom:56px}
        .all-plans-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .all-plans-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:520px;margin:0 auto;line-height:1.7}
        .all-plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1200px;margin:0 auto}
        .ap-card{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:28px 24px;transition:border-color .3s}
        .ap-card:hover{border-color:var(--bdr2)}
        .ap-icon{width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:var(--gold)}
        .ap-icon svg{width:20px;height:20px}
        .ap-card h4{font-size:.88rem;font-weight:500;margin-bottom:6px}
        .ap-card p{font-size:.76rem;color:var(--t3);line-height:1.6;font-weight:300}
        /* Collapsible "Compare every feature" sits below the pricing grid */
        .compare-toggle{max-width:1200px;margin:36px auto 0;text-align:center}
        .compare-toggle summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border:1px solid var(--bdr);border-radius:100px;background:var(--card);color:var(--t1);font-size:.86rem;font-weight:500;transition:border-color .2s,background .2s,color .2s;user-select:none}
        .compare-toggle summary::-webkit-details-marker{display:none}
        .compare-toggle summary:hover{border-color:var(--gold);color:var(--gold)}
        .compare-toggle[open] summary{border-color:var(--gold);color:var(--gold);background:rgba(37,99,235,.04)}
        .compare-toggle .ct-arrow{display:inline-block;transition:transform .25s ease;width:14px;height:14px}
        .compare-toggle[open] .ct-arrow{transform:rotate(180deg)}
        .compare-toggle-wrap{display:flex;justify-content:center}
        .compare-table-wrap{margin-top:36px;overflow-x:auto;animation:ctSlide .35s ease}
        @keyframes ctSlide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .compare-table{width:100%;border-collapse:collapse}
        .compare-table thead th{padding:16px 20px;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--t2);text-align:center;border-bottom:1px solid var(--bdr)}
        .compare-table thead th:first-child{text-align:left;color:var(--t3)}
        .compare-table thead th.feat{color:var(--gold)}
        .compare-table tbody td{padding:14px 20px;font-size:.84rem;color:var(--t2);border-bottom:1px solid var(--bdr);text-align:center;font-weight:300;line-height:1.7}
        .compare-table tbody td:first-child{text-align:left;color:var(--t1);font-weight:400}
        .compare-table tbody tr:hover{background:rgba(37,99,235,.03)}
        .compare-table .check{color:var(--grn);font-size:1rem}
        .compare-table .dash{color:var(--t3)}
        .faq{padding:0 0 100px}
        .faq-header{text-align:center;margin-bottom:56px}
        .faq-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .faq-header p{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.75}
        .faq-list{max-width:720px;margin:0 auto}
        .faq-item{border-bottom:1px solid var(--bdr)}
        .faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;gap:16px}
        .faq-q h4{font-size:.92rem;font-weight:400;color:var(--t1);transition:color .2s}
        .faq-q:hover h4{color:#fff}
        .faq-icon{width:24px;height:24px;flex-shrink:0;color:var(--t3);transition:transform .3s,color .3s}
        .faq-item.open .faq-icon{transform:rotate(45deg);color:var(--gold)}
        .faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease}
        .faq-item.open .faq-a{max-height:300px;padding-bottom:20px}
        .faq-a p{font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300}
        @media(max-width:1024px){.pricing-grid .c{grid-template-columns:repeat(2,1fr);gap:16px}.p-card{padding:36px 28px 28px}.p-card-name{font-size:1.35rem}.p-card-price .amount{font-size:2.5rem;letter-spacing:-1.5px}.all-plans-grid{grid-template-columns:repeat(2,1fr)}.premium-wrap{grid-template-columns:1fr}.premium-features{border-left:none;border-top:1px solid var(--bdr)}}
        @media(max-width:768px){.pricing-grid .c{grid-template-columns:1fr}.p-card{padding:40px 32px 32px}.p-card-name{font-size:1.45rem}.p-card-price .amount{font-size:2.7rem;letter-spacing:-1.7px}.all-plans-grid{grid-template-columns:1fr}.premium-info{padding:36px 28px}.premium-features{padding:36px 28px}}
      `}</style>

      {/* PRICING HERO */}
      <section className="pricing-hero">
        <div className="c">
          <h1 className="rv">Simple, transparent <em>pricing</em></h1>
          <p className="rv">Every plan starts with a personal consultation. Pick the foundation that fits — we&apos;ll help you build from there.</p>
          <div className="toggle-wrap rv">
            <span id="lbl-monthly" className="toggle-label">Monthly</span>
            <div id="billing-toggle" className="toggle on" role="switch" aria-label="Toggle annual billing" aria-checked="true"></div>
            <span id="lbl-annual" className="toggle-label active">
              Annual{overallSavings ? <span className="save-badge">Save {overallSavings}%</span> : null}
            </span>
          </div>
          <p className="rv pricing-trial-note">Try free for 14 days. Cancel anytime.</p>
        </div>
      </section>

      {/* PRICING CARDS — 3 core plans */}
      <section className="pricing-grid rv">
        <div className="c">
          {plans.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--t3)', gridColumn: '1 / -1' }}>
              Plans are being updated — please check back shortly.
            </p>
          )}
          {plans.map((plan, idx) => {
            const isFeatured = plan.slug === featuredSlug;
            const monthly = plan.price_usd ?? plan.price_cad ?? 0;
            const yearly = plan.price_yearly_usd ?? plan.price_yearly_cad ?? 0;
            const yearlyDisplayPerMonth = annualMonthly(yearly);
            const savings = annualSavings(monthly, yearly);
            const features = getFeatures(plan);
            const tagline = plan.description
              || (idx === 0
                ? 'Get online today with a fast, secure WordPress site that just works. No servers to manage, no plugins to babysit, no hosting decisions to second-guess.'
                : idx === plans.length - 1
                  ? 'For businesses ready to compound. More sites, AI-powered SEO, priority support, and the growth tools you need — without paying enterprise prices.'
                  : 'A hands-on launchpad for growing businesses. Priority support, WooCommerce-ready, and monthly reporting to keep you on track.');
            return (
              <div key={plan.id} className={isFeatured ? 'p-card featured' : 'p-card'}>
                <h3 className="p-card-name">{plan.name}</h3>
                <div className="p-card-price">
                  <span className="currency">$</span>
                  <span
                    className="amount price-val"
                    data-monthly={dollars(monthly)}
                    data-annual={yearlyDisplayPerMonth}
                  >
                    {yearly ? yearlyDisplayPerMonth : dollars(monthly)}
                  </span>
                </div>
                <div className="p-card-period">USD per month</div>
                <div className="annual-note-slot">
                  {yearly > 0 && (
                    <div className="annual-note">
                      Billed annually · ${dollars(yearly)}/yr{savings ? ` · save ${savings}%` : ''}
                    </div>
                  )}
                </div>

                <p className="p-card-tag">{tagline}</p>

                <a
                  href={`/get-started?plan=${plan.slug}&billing=annual&trial=1`}
                  className="p-cta"
                >
                  Try for free
                </a>

                <div className="p-card-highlights">
                  <div className="p-card-highlights-label">Highlights</div>
                  <ul>
                    {features.map((f, i) => (
                      <li key={i}>{check()}{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PREMIUM — full-width card, visually distinct */}
      {premiumPlan && (() => {
        const pm = premiumPlan;
        const monthly = pm.price_usd ?? pm.price_cad ?? 0;
        const startingAt = Math.round(monthly / 100).toLocaleString('en-US');
        const features = getFeatures(pm);
        return (
          <section className="premium-section rv">
            <div className="c">
              <div className="premium-wrap">
                <div className="premium-info">
                  <div className="premium-label">{pm.name}</div>
                  <h3>The full stack for brands that don&apos;t compromise</h3>
                  <p className="premium-desc">
                    {pm.description || 'Everything in Growth plus dedicated infrastructure, a hands-on success team, and the tools and strategy to dominate your category.'}
                  </p>
                  <div className="premium-starting">Starting at</div>
                  <div className="premium-price-row">
                    <span className="currency">$</span>
                    <span className="amount">{startingAt}</span>
                  </div>
                  <div className="premium-period">USD per month · billed per site</div>
                  <div className="premium-annual-note" />
                  <a href="/contact" className="premium-cta">
                    Contact sales
                    <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </div>
                <div className="premium-features">
                  <div className="premium-features-label">Everything you get</div>
                  <ul>
                    {features.map((f, i) => (
                      <li key={i}>
                        <span className="ck-wrap">
                          <svg className="ck" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Comparison table — all 4 plans */}
      <section className="pricing-grid" style={{ padding: '0 0 60px' }}>
        <details className="compare-toggle">
          <summary>
            Compare every feature
            <svg className="ct-arrow" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {comparePlans.map((plan) => (
                    <th key={plan.id} className={plan.slug === featuredSlug ? 'feat' : ''}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Price</td>
                  {comparePlans.map((plan) => (
                    <td key={plan.id}>${dollars(plan.price_usd ?? plan.price_cad)} USD/mo</td>
                  ))}
                </tr>
                <tr>
                  <td>PHP workers</td>
                  {comparePlans.map((plan) => {
                    const w = (plan.metadata as any)?.php_workers_included;
                    return <td key={plan.id}>{w ? `Up to ${w}` : '—'}</td>;
                  })}
                </tr>
                <tr>
                  <td>SSD storage</td>
                  {comparePlans.map((plan) => {
                    const gb = (plan.metadata as any)?.storage_gb;
                    return <td key={plan.id}>{gb ? `${gb} GB` : 'Auto-scaling'}</td>;
                  })}
                </tr>
                <tr><td>WordPress on WP.Cloud</td>{comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>Free SSL + global CDN</td>{comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>Daily backups</td>{comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>Automatic updates</td>{comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr>
                  <td>Support</td>
                  {comparePlans.map((plan) => {
                    const s = (plan.metadata as any)?.support_type;
                    const label = s === 'priority' ? 'Priority' : s === 'dedicated' ? 'Dedicated' : 'Email';
                    return <td key={plan.id}>{label}</td>;
                  })}
                </tr>
                <tr><td>Full onboarding by our team</td>{comparePlans.map(p => {
                  const t = (p.metadata as any)?.onboarding_type;
                  const has = t && t !== 'standard';
                  return <td key={p.id} className={has ? 'check' : 'dash'}>{has ? '✓' : '—'}</td>;
                })}</tr>
                <tr><td>Free site migration</td>{comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>WooCommerce ready</td>{comparePlans.map(p => {
                  const isCheapest = p.slug === comparePlans[0]?.slug;
                  return <td key={p.id} className={isCheapest ? 'dash' : 'check'}>{isCheapest ? '—' : '✓'}</td>;
                })}</tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="all-plans rv"><div className="c">
        <div className="all-plans-header">
          <h2>Included with every plan</h2>
          <p>No matter which plan you choose, you get the essentials that make Envosta different — right out of the box.</p>
        </div>
        <div className="all-plans-grid">

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h4>Free SSL Certificate</h4>
            <p>Every site gets a free SSL certificate, auto-renewed and configured for you.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" /></svg></div>
            <h4>Global CDN</h4>
            <p>Content delivered from edge locations around the world for lightning-fast load times.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
            <h4>Daily Backups</h4>
            <p>Automatic daily backups with one-click restore, so your site is always protected and recoverable.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l9-3 9 3v6c0 5.5-3.5 10-9 12-5.5-2-9-6.5-9-12V5z" /><path d="M9 12l2 2 4-4" /></svg></div>
            <h4>Web Application Firewall</h4>
            <p>Always-on WAF blocks bots, brute-force attempts, and OWASP Top 10 threats before they hit your site.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
            <h4>99.99% Uptime SLA</h4>
            <p>Enterprise-grade infrastructure with guaranteed uptime across all plans.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
            <h4>Free Site Migration</h4>
            <p>Our team handles your entire migration — files, database, DNS — with zero downtime.</p>
          </div>

        </div>
      </div></section>

      {/* MORE OPTIONS — design packages with email-quote CTAs */}
      <DesignPackages />

      {/* Compare-every-feature section moved into the collapsible <details>
          underneath the pricing grid (replacing the old "Need a dedicated
          team — Get in touch" line). No standalone section here anymore. */}

      {/* FAQ */}
      <section className="faq rv"><div className="c">
        <div className="faq-header">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about our plans, billing, and support.</p>
        </div>
        <div className="faq-list">

          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I switch plans after signing up?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Absolutely. You can upgrade or downgrade at any time. When upgrading, the price difference is prorated. When downgrading, the new rate applies at your next billing cycle.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>What does the personal onboarding include?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>We walk through your goals, configure your hosting environment, install WordPress, set up your domain and SSL, and make sure everything is optimized before you go live.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Do you handle WordPress migrations?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. Our team will migrate your existing WordPress site for free with any plan. We handle everything — files, database, DNS configuration — with zero downtime.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Is my site backed up automatically?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. Every plan includes automatic daily backups with one-click restore. Backups are stored securely off-site so you can recover your site at any time.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>What kind of support can I expect?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Every plan includes email support with a fast response window. Higher tiers add priority support with quicker turnaround and more hands-on guidance.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Do you offer custom or enterprise plans?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Absolutely. If none of our standard plans fit your needs, reach out and we&apos;ll put together a custom solution with the exact resources and support you require.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I cancel at any time?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. There are no long-term contracts. Monthly plans can be cancelled anytime. Annual plans are covered by our 14-day money-back guarantee.</p></div>
          </div>

        </div>
      </div></section>
    </>
  );
}
