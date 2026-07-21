import type { Metadata } from 'next';
import PricingClient from './pricing-client';
import { createClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Hosting Plans — Envosta Managed WordPress Hosting',
  description: 'Your website, handled forever. One flat monthly price for hosting, security, speed, and a team that manages it all — on the infrastructure behind WordPress.com.',
  alternates: { canonical: 'https://envosta.com/plans' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'One flat monthly price for hosting, security, speed, and a team that manages it all — on the infrastructure behind WordPress.com.',
    url: 'https://envosta.com/plans',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Your website, handled forever. One flat monthly price — everything managed for you.',
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
  return Math.round(cents / 100).toLocaleString('en-US');
}

/** Annual displayed as a per-month equivalent (yearly / 12). */
function annualMonthly(yearlyCents: number | null | undefined): string {
  if (!yearlyCents) return '0';
  return Math.round(yearlyCents / 12 / 100).toLocaleString('en-US');
}

/** Dollar savings of annual vs monthly×12 — research says dollars beat
 * percentages for anchoring the commitment to a concrete amount. */
function saveDollars(monthly: number | null, yearly: number | null): number {
  if (!monthly || !yearly) return 0;
  const diff = monthly * 12 - yearly;
  return diff > 0 ? Math.round(diff / 100) : 0;
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
 * Offer copy per plan — outcome-led hooks + value stacks (the DB list in
 * products.features always overrides the stack; edit in Settings → Plans).
 * Business + Growth are the self-serve path; Enterprise is approval-only.
 */
const PLAN_OFFER: Record<string, { hook: string; stackIntro?: string; stack: string[] }> = {
  standard: {
    hook: 'Everything to get online — and stay online.',
    stack: [
      'Your site handled — updates, security & speed managed for you',
      '50 GB SSD on the infrastructure behind WordPress.com',
      'WooCommerce-ready — start selling whenever you want',
      'Lead-capture forms + Google Analytics wired in',
      'Priority support · 4-hour response',
    ],
  },
  growth: {
    hook: 'For sites that make you money.',
    stackIntro: 'Everything in Business, plus:',
    stack: [
      'Hands-on onboarding — we set it up with you',
      'First-in-queue support — skip the line, every time',
      'WooCommerce + subscriptions + Stripe — built to take payments',
      'A named human who knows your site',
    ],
  },
  enterprise: {
    hook: 'Invitation-grade infrastructure, personally run.',
    stack: [
      'Architected and hardened by our senior team',
      'White-glove onboarding + full site build',
      'Custom integrations + API access',
      'Custom resource scaling on request',
    ],
  },
};

function getStack(plan: HostingPlan): string[] {
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    const fromDb = plan.features.filter((f): f is string => typeof f === 'string' && f.trim().length > 0);
    if (fromDb.length > 0) return fromDb;
  }
  return PLAN_OFFER[(plan.slug || '').toLowerCase()]?.stack ?? [];
}

/** Slugs sold self-serve, in ladder order. Minimum stays hidden (internal). */
const CORE_SLUGS = ['standard', 'growth'];

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

  const plans = CORE_SLUGS
    .map((s) => allPlans.find((p) => p.slug === s))
    .filter(Boolean) as HostingPlan[];
  const enterprisePlan = allPlans.find((p) => p.slug === 'enterprise') ?? null;

  // Growth is the featured (anchored) card of the self-serve pair.
  const featuredSlug = 'growth';
  const comparePlans = enterprisePlan ? [...plans, enterprisePlan] : plans;

  // Hero badge: the biggest concrete annual saving across self-serve plans.
  const maxSave = Math.max(
    0,
    ...plans.map((p) => saveDollars(p.price_usd ?? p.price_cad, p.price_yearly_usd ?? p.price_yearly_cad)),
  );

  return (
    <>
      <PricingClient />

      <style>{`
        /* ─────────────────────────  HERO  ───────────────────────── */
        .pricing-hero{padding:150px 0 64px;text-align:center;position:relative;overflow:hidden}
        .pricing-hero::before{content:'';position:absolute;top:-42%;left:50%;transform:translateX(-50%);width:900px;height:900px;background:radial-gradient(circle,rgba(37,99,235,.14),transparent 62%);pointer-events:none}
        .pricing-hero .c{position:relative;z-index:1}
        .ph-eyebrow{display:inline-block;font-size:.68rem;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:18px}
        .pricing-hero h1{font-size:clamp(2.5rem,5.4vw,4rem);font-weight:600;letter-spacing:-2px;line-height:1.08;margin-bottom:18px}
        .pricing-hero h1 em{font-style:normal;color:#fff;font-weight:500}
        .pricing-hero .ph-sub{font-size:1.06rem;color:var(--t2);max-width:560px;margin:0 auto 28px;line-height:1.75;font-weight:300}
        .ph-assure{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:38px}
        .ph-assure span{display:inline-flex;align-items:center;gap:7px;font-size:.76rem;color:var(--t2);border:1px solid var(--bdr);background:var(--card);border-radius:100px;padding:7px 15px;font-weight:400}
        .ph-assure .dot{width:5px;height:5px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5)}
        .toggle-wrap{display:flex;align-items:center;justify-content:center;gap:16px}
        .toggle-label{font-size:.9rem;color:var(--t3);font-weight:400;transition:color .2s;cursor:default}
        .toggle-label.active{color:var(--t1);font-weight:500}
        .toggle{width:52px;height:28px;background:var(--card2);border:1px solid var(--bdr2);border-radius:100px;cursor:pointer;position:relative;transition:background .3s,border-color .3s;flex-shrink:0}
        .toggle::before{content:'';position:absolute;inset:-10px;border-radius:100px}
        .toggle::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .3s}
        .toggle.on{background:var(--gold);border-color:var(--gold)}.toggle.on::after{transform:translateX(24px)}
        .toggle:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
        .save-badge{display:inline-block;margin-left:8px;font-size:.68rem;font-weight:600;color:#22c55e;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);padding:3px 10px;border-radius:100px;letter-spacing:.3px;vertical-align:1px}

        /* ─────────────────────────  CARDS  ──────────────────────── */
        .pricing-grid{padding:26px 0 56px}
        .pricing-grid .c{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1200px;margin:0 auto;align-items:stretch}
        .p-card{background:var(--card);border:1px solid var(--bdr);border-radius:22px;padding:38px 34px 30px;position:relative;display:flex;flex-direction:column;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
        .p-card:hover{transform:translateY(-4px);border-color:var(--bdr2);box-shadow:0 24px 48px -28px rgba(0,0,0,.6)}
        .p-card.featured{border-color:var(--gold);background:linear-gradient(175deg,rgba(37,99,235,.09),var(--card) 52%);box-shadow:0 24px 60px -30px rgba(37,99,235,.35)}
        .p-card.featured:hover{box-shadow:0 30px 70px -30px rgba(37,99,235,.45)}
        .p-card.featured::before{content:'Most Popular';position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;font-size:.64rem;font-weight:700;padding:6px 18px;border-radius:100px;letter-spacing:1.4px;text-transform:uppercase;white-space:nowrap}
        .p-card-name{font-size:1.32rem;font-weight:600;color:var(--t1);letter-spacing:-.4px;line-height:1.2}
        .p-card-hook{font-size:.86rem;color:var(--t2);font-weight:300;line-height:1.55;margin:6px 0 22px;min-height:2.6em}
        .p-card-price{display:flex;align-items:baseline;gap:5px}
        .p-card-price .currency{font-size:1.3rem;font-weight:500;color:var(--t1)}
        .p-card-price .amount{font-size:3.1rem;font-weight:650;letter-spacing:-2px;color:#fff;line-height:1;font-variant-numeric:tabular-nums}
        .p-card-price .per{font-size:.84rem;color:var(--t3);font-weight:300}
        .p-card-period{font-size:.74rem;color:var(--t3);font-weight:300;margin-top:7px}
        .annual-note-slot{min-height:26px;margin-top:9px}
        .annual-note{display:inline-flex;align-items:center;gap:6px;font-size:.73rem;color:#22c55e;font-weight:500;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:100px;padding:3px 11px;width:fit-content}
        .p-cta{display:block;width:100%;text-align:center;padding:14px 24px;font-size:.9rem;font-weight:600;letter-spacing:.3px;border-radius:12px;background:transparent;border:1.5px solid var(--bdr2);color:var(--t1);text-decoration:none;transition:background .2s,border-color .2s,color .2s,transform .15s;margin-top:22px}
        .p-cta:hover{background:rgba(255,255,255,.04);border-color:var(--t2);color:#fff;transform:translateY(-1px)}
        .p-cta:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
        .p-card.featured .p-cta{background:var(--gold);border-color:var(--gold);color:#fff}
        .p-card.featured .p-cta:hover{background:var(--gold-bright);border-color:var(--gold-bright)}
        .p-cta-sub{font-size:.68rem;color:var(--t3);text-align:center;margin-top:9px;font-weight:300;min-height:1em}
        .p-card-highlights{margin-top:24px;padding-top:22px;border-top:1px solid var(--bdr)}
        .p-card-highlights-label{font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--t3);margin-bottom:13px}
        .p-card-highlights-label.plus{color:var(--gold)}
        .p-card-highlights ul{list-style:none;margin:0;padding:0}
        .p-card-highlights li{display:flex;align-items:flex-start;gap:10px;font-size:.85rem;color:var(--t2);padding:5.5px 0;font-weight:300;line-height:1.55}
        .ck-wrap{flex-shrink:0;width:17px;height:17px;border-radius:50%;background:rgba(37,99,235,.12);display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
        .ck{width:9px;height:9px;color:var(--gold)}

        /* Enterprise — approval-only, quiet-premium */
        .p-card.enterprise{background:linear-gradient(168deg,rgba(255,255,255,.06),var(--card) 46%);border-color:rgba(255,255,255,.18);box-shadow:0 26px 64px -38px rgba(0,0,0,.9)}
        .p-card.enterprise::before{content:'By Approval Only';position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--bg);color:var(--t1);font-size:.6rem;font-weight:600;padding:6px 16px;border-radius:100px;letter-spacing:2.2px;text-transform:uppercase;border:1px solid rgba(255,255,255,.3);white-space:nowrap}
        .p-card.enterprise .p-card-name{background:linear-gradient(90deg,#fff,rgba(255,255,255,.5));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
        .ent-starting{font-size:.66rem;font-weight:600;text-transform:uppercase;letter-spacing:1.8px;color:var(--t3);margin-bottom:7px}
        .p-card.enterprise .p-cta{border-color:rgba(255,255,255,.35);color:#fff;background:rgba(255,255,255,.04)}
        .p-card.enterprise .p-cta:hover{background:#fff;border-color:#fff;color:#0a0f1a}
        .p-card.enterprise .ck-wrap{background:rgba(255,255,255,.09)}
        .p-card.enterprise .ck{color:#fff}

        /* Reassurance strip under the grid */
        .p-strip{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 28px;max-width:1200px;margin:26px auto 0;padding:0 20px}
        .p-strip span{display:inline-flex;align-items:center;gap:8px;font-size:.78rem;color:var(--t3);font-weight:300}
        .p-strip svg{width:14px;height:14px;color:var(--gold);flex-shrink:0}

        /* ───────────────  PROVENANCE BAND  ─────────────── */
        .prov{padding:34px 0}
        .prov .c{max-width:1200px;margin:0 auto}
        .prov-inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px 22px;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:22px 16px;text-align:center}
        .prov-inner p{font-size:.86rem;color:var(--t2);font-weight:300;line-height:1.7;max-width:760px}
        .prov-inner strong{color:var(--t1);font-weight:500}

        /* ───────────────  INCLUDED IN EVERY PLAN  ─────────────── */
        .all-plans{padding:72px 0 20px}
        .all-plans-header{text-align:center;margin-bottom:48px}
        .all-plans-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .all-plans-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:520px;margin:0 auto;line-height:1.7}
        .all-plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1200px;margin:0 auto}
        .ap-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:28px 26px;transition:border-color .3s,transform .3s}
        .ap-card:hover{border-color:var(--bdr2);transform:translateY(-2px)}
        .ap-icon{width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:var(--gold)}
        .ap-icon svg{width:20px;height:20px}
        .ap-card h4{font-size:.9rem;font-weight:500;margin-bottom:6px;color:var(--t1)}
        .ap-card p{font-size:.78rem;color:var(--t3);line-height:1.65;font-weight:300}

        /* ───────────────  NOT-$10-HOSTING CONTRAST  ─────────────── */
        .vs{padding:80px 0 30px}
        .vs .c{max-width:1000px;margin:0 auto}
        .vs-header{text-align:center;margin-bottom:44px}
        .vs-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .vs-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:560px;margin:0 auto;line-height:1.7}
        .vs-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .vs-col{border:1px solid var(--bdr);border-radius:18px;padding:30px 28px;background:var(--card)}
        .vs-col.us{border-color:rgba(37,99,235,.4);background:linear-gradient(175deg,rgba(37,99,235,.07),var(--card) 55%)}
        .vs-col h3{font-size:1rem;font-weight:600;color:var(--t1);margin-bottom:16px;letter-spacing:-.2px}
        .vs-col ul{list-style:none;margin:0;padding:0}
        .vs-col li{display:flex;align-items:flex-start;gap:10px;font-size:.86rem;padding:6.5px 0;font-weight:300;line-height:1.6;color:var(--t2)}
        .vs-col.them li{color:var(--t3)}
        .vs-x{flex-shrink:0;width:16px;height:16px;color:var(--t3);opacity:.7;margin-top:3px}
        .vs-col.us .ck-wrap{margin-top:3px}

        /* ───────────────  COMPARE TABLE  ─────────────── */
        .compare-section{padding:26px 0 40px}
        .compare-toggle{max-width:1200px;margin:0 auto;text-align:center}
        .compare-toggle summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border:1px solid var(--bdr);border-radius:100px;background:var(--card);color:var(--t1);font-size:.86rem;font-weight:500;transition:border-color .2s,background .2s,color .2s;user-select:none}
        .compare-toggle summary::-webkit-details-marker{display:none}
        .compare-toggle summary:hover{border-color:var(--gold);color:var(--gold)}
        .compare-toggle[open] summary{border-color:var(--gold);color:var(--gold);background:rgba(37,99,235,.04)}
        .compare-toggle .ct-arrow{display:inline-block;transition:transform .25s ease;width:14px;height:14px}
        .compare-toggle[open] .ct-arrow{transform:rotate(180deg)}
        .compare-table-wrap{margin-top:36px;overflow-x:auto;animation:ctSlide .35s ease}
        @keyframes ctSlide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .compare-table{width:100%;border-collapse:collapse}
        .compare-table thead th{padding:16px 20px;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--t2);text-align:center;border-bottom:1px solid var(--bdr)}
        .compare-table thead th:first-child{text-align:left;color:var(--t3)}
        .compare-table thead th.feat{color:var(--gold)}
        .compare-table tbody td{padding:14px 20px;font-size:.84rem;color:var(--t2);border-bottom:1px solid var(--bdr);text-align:center;font-weight:300;line-height:1.7;font-variant-numeric:tabular-nums}
        .compare-table tbody td:first-child{text-align:left;color:var(--t1);font-weight:400}
        .compare-table tbody tr:hover{background:rgba(37,99,235,.03)}
        .compare-table .check{color:var(--grn);font-size:1rem}
        .compare-table .dash{color:var(--t3)}

        /* ───────────────  FAQ  ─────────────── */
        .faq{padding:70px 0 40px}
        .faq-header{text-align:center;margin-bottom:48px}
        .faq-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .faq-header p{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.75}
        .faq-list{max-width:720px;margin:0 auto}
        .faq-item{border-bottom:1px solid var(--bdr)}
        .faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;gap:16px}
        .faq-q h4{font-size:.94rem;font-weight:400;color:var(--t1);transition:color .2s}
        .faq-q:hover h4{color:#fff}
        .faq-icon{width:24px;height:24px;flex-shrink:0;color:var(--t3);transition:transform .3s,color .3s}
        .faq-item.open .faq-icon{transform:rotate(45deg);color:var(--gold)}
        .faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease}
        .faq-item.open .faq-a{max-height:300px;padding:0}
        .faq-a p{font-size:.88rem;color:var(--t3);line-height:1.75;font-weight:300;padding-bottom:20px;max-width:640px}

        /* ───────────────  FINAL CTA  ─────────────── */
        .final-cta{padding:70px 0 110px}
        .final-cta .c{max-width:820px;margin:0 auto}
        .fc-box{text-align:center;border:1px solid rgba(37,99,235,.28);border-radius:24px;padding:58px 40px;background:linear-gradient(180deg,rgba(37,99,235,.08),var(--card) 65%);position:relative;overflow:hidden}
        .fc-box::before{content:'';position:absolute;top:-60%;left:50%;transform:translateX(-50%);width:520px;height:520px;background:radial-gradient(circle,rgba(37,99,235,.16),transparent 62%);pointer-events:none}
        .fc-box h2{font-size:clamp(1.7rem,3.4vw,2.5rem);font-weight:600;letter-spacing:-1px;line-height:1.15;margin-bottom:12px;position:relative}
        .fc-box p{font-size:.94rem;color:var(--t2);font-weight:300;max-width:460px;margin:0 auto 30px;line-height:1.75;position:relative}
        .fc-cta{display:inline-block;padding:15px 38px;font-size:.94rem;font-weight:600;letter-spacing:.3px;border-radius:12px;background:var(--gold);color:#fff;text-decoration:none;transition:background .2s,transform .15s;position:relative}
        .fc-cta:hover{background:var(--gold-bright);transform:translateY(-1px)}
        .fc-sub{display:block;margin-top:16px;font-size:.74rem;color:var(--t3);font-weight:300;position:relative}
        .fc-sub a{color:var(--t2);text-decoration:underline;text-underline-offset:3px}
        .fc-sub a:hover{color:#fff}

        /* ───────────────  RESPONSIVE + MOTION  ─────────────── */
        @media(max-width:1024px){
          .pricing-grid .c{grid-template-columns:1fr 1fr;gap:16px}
          .p-card{padding:34px 28px 26px}
          .p-card.enterprise{grid-column:1/-1;max-width:560px;margin:12px auto 0;width:100%}
          .all-plans-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:720px){
          .pricing-hero{padding:130px 0 48px}
          .pricing-grid .c{grid-template-columns:1fr}
          .p-card.enterprise{grid-column:auto;max-width:none;margin:8px 0 0}
          .p-card-price .amount{font-size:2.8rem}
          .all-plans-grid{grid-template-columns:1fr}
          .vs-grid{grid-template-columns:1fr}
          .fc-box{padding:44px 24px}
        }
        @media(prefers-reduced-motion:reduce){
          .p-card,.p-cta,.ap-card,.toggle::after,.faq-a,.compare-table-wrap{transition:none;animation:none}
          .p-card:hover{transform:none}
        }
      `}</style>

      {/* ═══════════════════  HERO — the offer, not "pricing"  ═══════════════════ */}
      <section className="pricing-hero">
        <div className="c">
          <span className="ph-eyebrow rv">Pricing</span>
          <h1 className="rv">Your website. <em>Handled forever.</em></h1>
          <p className="ph-sub rv">
            One flat monthly price. We build, host, secure, speed up, and manage your WordPress
            site on the same infrastructure behind WordPress.com — you run your business.
          </p>
          <div className="ph-assure rv">
            <span><span className="dot" />14-day free trial</span>
            <span><span className="dot" />No charge today</span>
            <span><span className="dot" />Cancel anytime — keep everything</span>
          </div>
          <div className="toggle-wrap rv">
            <span id="lbl-monthly" className="toggle-label">Monthly</span>
            <div id="billing-toggle" className="toggle on" role="switch" tabIndex={0} aria-label="Toggle annual billing" aria-checked="true"></div>
            <span id="lbl-annual" className="toggle-label active">
              Annual{maxSave > 0 ? <span className="save-badge">Save up to ${maxSave.toLocaleString('en-US')}/yr</span> : null}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════  THE THREE TIERS  ═══════════════════ */}
      <section className="pricing-grid rv">
        <div className="c">
          {comparePlans.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--t3)', gridColumn: '1 / -1' }}>
              Plans are being updated — please check back shortly.
            </p>
          )}
          {comparePlans.map((plan) => {
            const isFeatured = plan.slug === featuredSlug;
            const isEnterprise = plan.slug === 'enterprise';
            const offer = PLAN_OFFER[(plan.slug || '').toLowerCase()];
            const monthly = plan.price_usd ?? plan.price_cad ?? 0;
            const yearly = plan.price_yearly_usd ?? plan.price_yearly_cad ?? 0;
            const save = saveDollars(monthly, yearly);
            const stack = getStack(plan);
            return (
              <div key={plan.id} className={isEnterprise ? 'p-card enterprise' : isFeatured ? 'p-card featured' : 'p-card'}>
                <h3 className="p-card-name">{plan.name}</h3>
                <p className="p-card-hook">{offer?.hook ?? plan.description ?? ''}</p>

                {isEnterprise && <div className="ent-starting">Starting at</div>}
                <div className="p-card-price">
                  <span className="currency">$</span>
                  <span
                    className="amount price-val"
                    data-monthly={dollars(monthly)}
                    data-annual={isEnterprise ? dollars(monthly) : annualMonthly(yearly)}
                  >
                    {isEnterprise ? dollars(monthly) : yearly ? annualMonthly(yearly) : dollars(monthly)}
                  </span>
                  <span className="per">/mo</span>
                </div>
                <div className="p-card-period">{isEnterprise ? 'USD · custom engagement, scoped to you' : 'USD per month'}</div>
                <div className="annual-note-slot">
                  {!isEnterprise && yearly > 0 && (
                    <div className="annual-note">
                      ${dollars(yearly)} billed yearly{save > 0 ? ` — save $${save.toLocaleString('en-US')}` : ''}
                    </div>
                  )}
                </div>

                {isEnterprise ? (
                  <>
                    <a href="/contact" className="p-cta">Request Access</a>
                    <div className="p-cta-sub">Limited engagements · reviewed by our senior team</div>
                  </>
                ) : (
                  <>
                    <a href={`/get-started?plan=${plan.slug}&billing=annual&trial=1`} className="p-cta">
                      Start Free Trial
                    </a>
                    <div className="p-cta-sub">14 days free, then ${dollars(monthly)}/mo · cancel anytime</div>
                  </>
                )}

                <div className="p-card-highlights">
                  <div className={offer?.stackIntro ? 'p-card-highlights-label plus' : 'p-card-highlights-label'}>
                    {isEnterprise ? 'The white-glove standard' : offer?.stackIntro ?? 'What you get'}
                  </div>
                  <ul>
                    {stack.map((f, i) => (
                      <li key={i}>{check()}{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        {/* Reassurance strip — risk reversal, stated plainly */}
        <div className="p-strip rv">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>Free white-glove migration</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>Your domain &amp; content are always yours</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>Real humans, fast answers</span>
        </div>
      </section>

      {/* ═══════════════════  PROVENANCE  ═══════════════════ */}
      <section className="prov rv">
        <div className="c">
          <div className="prov-inner">
            <p>
              Every plan runs on <strong>wp.cloud</strong> — the hosting platform built by
              <strong> Automattic, the makers of WordPress</strong>. It&apos;s the same
              infrastructure behind WordPress.com, and Envosta is a direct partner — not a
              reseller.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════  INCLUDED WITH EVERY PLAN  ═══════════════════ */}
      <section className="all-plans rv"><div className="c">
        <div className="all-plans-header">
          <h2>Included with every plan</h2>
          <p>The essentials aren&apos;t add-ons here. Every site ships with all of it — configured, monitored, and maintained by us.</p>
        </div>
        <div className="all-plans-grid">
          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h4>Free SSL, forever</h4>
            <p>Issued, configured, and auto-renewed for you. Your site is always served securely.</p>
          </div>
          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" /></svg></div>
            <h4>Global edge CDN</h4>
            <p>Pages served from the location nearest your visitor — fast everywhere, automatically.</p>
          </div>
          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
            <h4>Daily backups</h4>
            <p>Automatic, stored off-site, restorable in one click. Bad day? Roll it back.</p>
          </div>
          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l9-3 9 3v6c0 5.5-3.5 10-9 12-5.5-2-9-6.5-9-12V5z" /><path d="M9 12l2 2 4-4" /></svg></div>
            <h4>Security that watches</h4>
            <p>An always-on firewall blocks bots, brute-force attempts, and known threats before they reach you.</p>
          </div>
          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
            <h4>99.99% uptime</h4>
            <p>Enterprise-grade infrastructure with automatic failover — monitored around the clock.</p>
          </div>
          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
            <h4>Free migration, done for you</h4>
            <p>Files, database, DNS — our team moves your whole site with zero downtime. You watch.</p>
          </div>
        </div>
      </div></section>

      {/* ═══════════════════  WHY NOT $10 HOSTING  ═══════════════════ */}
      <section className="vs rv">
        <div className="c">
          <div className="vs-header">
            <h2>Why this isn&apos;t $10 hosting</h2>
            <p>Cheap hosting rents you an empty server — the site, the security, and the 2 a.m. problems are yours. An Envosta plan makes all of it our job.</p>
          </div>
          <div className="vs-grid">
            <div className="vs-col them">
              <h3>$10/mo hosting</h3>
              <ul>
                <li><svg className="vs-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>A control panel and a &quot;good luck&quot;</li>
                <li><svg className="vs-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>Updates, security, and backups are your problem</li>
                <li><svg className="vs-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>Oversold servers that crawl under load</li>
                <li><svg className="vs-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>Support tickets that read from a script</li>
              </ul>
            </div>
            <div className="vs-col us">
              <h3>An Envosta plan</h3>
              <ul>
                <li>{check()}Your site built, managed, and kept fast by our team</li>
                <li>{check()}Updates, security, and backups handled — automatically, daily</li>
                <li>{check()}The same infrastructure that runs WordPress.com</li>
                <li>{check()}One place to ask for anything — a human answers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════  COMPARE TABLE  ═══════════════════ */}
      <section className="compare-section rv">
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
                    <td key={plan.id}>
                      {plan.slug === 'enterprise'
                        ? `From $${dollars(plan.price_usd ?? plan.price_cad)} USD/mo`
                        : `$${dollars(plan.price_usd ?? plan.price_cad)} USD/mo`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>SSD storage</td>
                  {comparePlans.map((plan) => {
                    const gb = (plan.metadata as any)?.storage_gb;
                    return <td key={plan.id}>{plan.slug === 'enterprise' ? 'Custom' : gb ? `${gb} GB` : '50 GB'}</td>;
                  })}
                </tr>
                <tr>
                  <td>Managed WordPress on wp.cloud</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>Free SSL + global CDN</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>Daily backups + firewall</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>Automatic updates</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>Free migration</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>WooCommerce-ready</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>Lead capture + Google Analytics</td>
                  {comparePlans.map(p => <td key={p.id} className="check">{'✓'}</td>)}
                </tr>
                <tr>
                  <td>Support</td>
                  {comparePlans.map((plan) => (
                    <td key={plan.id}>
                      {plan.slug === 'standard' ? 'Priority · 4-hr response'
                        : plan.slug === 'growth' ? 'First-in-queue'
                        : 'Senior team, direct'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Onboarding</td>
                  {comparePlans.map((plan) => (
                    <td key={plan.id}>
                      {plan.slug === 'standard' ? 'Guided call (60 min)'
                        : plan.slug === 'growth' ? 'Hands-on setup with you'
                        : 'White-glove + full site build'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Payments (subscriptions + Stripe)</td>
                  {comparePlans.map((plan) => (
                    <td key={plan.id} className={plan.slug === 'standard' ? 'dash' : 'check'}>
                      {plan.slug === 'standard' ? '—' : '✓'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Custom integrations + API access</td>
                  {comparePlans.map((plan) => (
                    <td key={plan.id} className={plan.slug === 'enterprise' ? 'check' : 'dash'}>
                      {plan.slug === 'enterprise' ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>How you join</td>
                  {comparePlans.map((plan) => (
                    <td key={plan.id}>
                      {plan.slug === 'enterprise' ? 'By approval' : 'Free trial, self-serve'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* ═══════════════════  FAQ — objection handling  ═══════════════════ */}
      <section className="faq rv"><div className="c">
        <div className="faq-header">
          <h2>Questions, answered straight</h2>
          <p>The things people actually ask before they start.</p>
        </div>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-q">
              <h4>Do I need to know anything about WordPress?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>No. That&apos;s the point of managed. We set everything up, keep it updated and secure, and when you want something changed, you ask — we do it. Be as hands-on or hands-off as you like.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-q">
              <h4>I already have a website. How hard is switching?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>You don&apos;t lift a finger. Free migration is included with every plan: our team moves your files, database, email, and DNS, verifies everything works, and only then does anything switch over. Zero downtime.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-q">
              <h4>What happens after the 14-day free trial?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Your plan starts at the exact price shown above — nothing hidden, no surprise line items. Cancel before the trial ends and you pay nothing. Cancel later and your domain and content leave with you.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-q">
              <h4>Why wouldn&apos;t I just use $10/month hosting?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Cheap hosting rents you an empty server — the building, updating, securing, backing up, and fixing is all on you. Here that&apos;s all our job, on the same infrastructure that runs WordPress.com. You&apos;re not buying a server; you&apos;re retiring a to-do list.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I switch plans later?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Anytime, from your dashboard. Upgrades take effect immediately with the difference prorated; downgrades apply at your next billing cycle. No calls required, no penalties.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-q">
              <h4>How does Enterprise approval work?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Enterprise isn&apos;t self-serve. You request access, our senior team reviews the fit, and if it&apos;s right we scope a custom engagement — infrastructure, build, integrations, and support tailored to the site. We take on a limited number at a time.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I cancel anytime?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. No contracts, no lock-in, no exit process. Monthly plans cancel instantly; annual plans carry a 14-day money-back guarantee. Your domain is registered in your name and your content is always yours — if you go, everything goes with you.</p></div>
          </div>
        </div>
      </div></section>

      {/* ═══════════════════  FINAL CTA  ═══════════════════ */}
      <section className="final-cta rv">
        <div className="c">
          <div className="fc-box">
            <h2>Stop babysitting your website.</h2>
            <p>
              Start free today. If it&apos;s not the easiest your site has ever been to own,
              cancel in two clicks and keep everything.
            </p>
            <a href="/get-started?billing=annual&trial=1" className="fc-cta">Start Your Free Trial</a>
            <span className="fc-sub">
              14 days free · no charge today · questions? <a href="/support">talk to a human</a>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
