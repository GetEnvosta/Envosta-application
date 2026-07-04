/**
 * /[industry]/[city] — the parameterized industry+city landing template
 * (rebuild brief Phase 2.3). One template renders every industry and city:
 * /hvac/calgary, /roofing/calgary, and any future config-added industry —
 * ZERO industry-specific code. Unknown industries 404; any city renders
 * with its honest exclusivity status from the config ledger.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  activeIndustries,
  getIndustry,
  citySpotStatus,
  spotsRemaining,
} from '@/config/industries';
import { publicPlans, formatDollars, SERVICE_PROMISE } from '@/config/pricing';
import { GUARANTEES } from '@/config/offer';

export const dynamicParams = true;

export function generateStaticParams() {
  // Launch metro pre-rendered per industry; other cities render on demand.
  return activeIndustries().map((i) => ({ industry: i.slug, city: 'calgary' }));
}

function cityName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata(
  { params }: { params: Promise<{ industry: string; city: string }> },
): Promise<Metadata> {
  const { industry: industrySlug, city: citySlug } = await params;
  const industry = getIndustry(industrySlug);
  if (!industry) return {};
  const city = cityName(citySlug);
  return {
    title: `${industry.name} Website & Hosting in ${city} — Envosta`,
    description: `Industry-specialized managed hosting for ${industry.vocabulary.businessNoun}s in ${city}: the site, the local SEO, and the reviews — handled. One ${industry.vocabulary.businessNoun} per city.`,
    alternates: { canonical: `https://envosta.com/${industry.slug}/${citySlug}` },
  };
}

export default async function IndustryCityPage(
  { params }: { params: Promise<{ industry: string; city: string }> },
) {
  const { industry: industrySlug, city: citySlug } = await params;
  const industry = getIndustry(industrySlug);
  if (!industry) notFound();

  const city = cityName(citySlug);
  const status = citySpotStatus(industry.slug, city);
  const remaining = spotsRemaining(industry.slug);
  const plans = publicPlans();
  const basic = plans[0];
  const makeGood = GUARANTEES.find((g) => g.key === 'booked_calls_make_good');
  const v = industry.vocabulary;

  return (
    <div className="mk2">
      <style>{`
        .ic-hero{padding:88px 0 56px}
        .ic-hero h1{max-width:800px}
        .ic-hero .sub{max-width:640px;margin-top:20px;font-size:1.05rem;line-height:1.75}
        .ic-status{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;border-radius:3px;padding:7px 13px;margin-bottom:24px;border:1px solid}
        .ic-status--open{color:var(--amber);border-color:rgba(255,182,39,.4)}
        .ic-status--taken{color:var(--steel);border-color:var(--navy-edge)}
        .ic-dot{width:7px;height:7px;border-radius:50%;background:currentColor}
        .ic-block{padding-top:0}
        .ic-block .panel{padding:32px 30px}
        .ic-block p{max-width:740px;line-height:1.75;font-size:.96rem}
        .ic-svcs{display:grid;grid-template-columns:1fr;gap:12px;margin-top:22px}
        @media(min-width:760px){.ic-svcs{grid-template-columns:1fr 1fr}}
        .ic-svc{padding:16px 18px;font-size:.9rem;color:var(--paper);display:flex;gap:10px;align-items:center}
        .ic-svc .tick{color:var(--amber);flex-shrink:0}
        .ic-search{font-family:var(--font-mono);font-size:.85rem;color:var(--paper);background:var(--navy-deep);border:1px solid var(--navy-edge);border-radius:3px;padding:10px 14px;display:inline-block;margin-top:14px}
        .ic-cta{padding-top:0;padding-bottom:100px}
        .ic-cta .panel{padding:52px 30px;text-align:center}
        .ic-cta p{max-width:560px;margin:12px auto 26px;line-height:1.7}
      `}</style>

      {/* ── Hero with honest exclusivity status ──────────────── */}
      <section className="ic-hero">
        <div className="wrap">
          <span className={`ic-status ${status === 'taken' ? 'ic-status--taken' : 'ic-status--open'}`}>
            <span className="ic-dot" aria-hidden="true" />
            {status === 'taken'
              ? `${city} is taken for ${industry.name}`
              : status === 'reserved'
                ? `${city} is on hold for ${industry.name}`
                : `${city} is open for ${industry.name} — ${remaining} of ${industry.growthCap} spots left`}
          </span>
          <h1>
            The {v.businessNoun} that owns the search in {city} <em>gets the {v.jobNoun}.</em>
          </h1>
          <p className="sub">
            Envosta hosts {industry.name.toLowerCase()} businesses — and only a chosen few
            industries — so your hosting plan includes the site built for {v.jobNoun} like{' '}
            {v.serviceExamples[0]}, the service-area pages that rank in {city}, and the review
            engine that makes callers pick you.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
            <Link href="/scorecard" className="btn btn--primary">
              {status === 'taken' ? 'Get the scorecard anyway' : `Check your ${city} scorecard`}
            </Link>
            <Link href="/plans" className="btn btn--ghost">See the hosting plans</Link>
          </div>
        </div>
      </section>

      {/* ── What specialized hosting includes ────────────────── */}
      <section className="ic-block">
        <div className="wrap">
          <div className="panel">
            <span className="eyebrow">What {industry.name} hosting includes</span>
            <h2 style={{ margin: '12px 0' }}>Built for the way people hire a {v.businessNoun}.</h2>
            <p>
              A {v.ownerTitle} doesn&apos;t need a brochure — you need to show up when someone in{' '}
              {city} searches with intent and money on the line. Every plan ships with pages built
              around your services, click-to-call on everything, and a Google Business Profile
              tuned for the map pack. Plans start at {basic ? formatDollars(basic.monthlyCents) : ''}/month.
            </p>
            <span className="ic-search num">“{v.searchExamples[0]}”</span>
            <div className="ic-svcs">
              {v.serviceExamples.map((s) => (
                <div key={s} className="panel ic-svc">
                  <svg className="tick" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s.charAt(0).toUpperCase() + s.slice(1)} pages that rank
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Service-area pages explained ─────────────────────── */}
      <section className="ic-block">
        <div className="wrap">
          <div className="panel">
            <span className="eyebrow">Service-area pages</span>
            <h2 style={{ margin: '12px 0' }}>The compounding asset, shipped monthly.</h2>
            <p>
              Each month we publish ranking-targeted pages for the neighbourhoods and services you
              want to own around {city} — written for your industry, QA&apos;d by a human, and
              reported to you in plain numbers. Search is a compounding asset: the review engine
              produces visible wins in the first 30 days while the pages build toward the typical
              ROI-positive window of 7–9 months. Rented ads stop when you stop paying. These pages
              are yours.
            </p>
          </div>
        </div>
      </section>

      {/* ── Exclusivity + guarantee ──────────────────────────── */}
      <section className="ic-block">
        <div className="wrap">
          <div className="panel" style={{ borderColor: 'rgba(255,182,39,.35)' }}>
            <span className="eyebrow">One {v.businessNoun} per city</span>
            <h2 style={{ margin: '12px 0' }}>
              {status === 'taken'
                ? `The ${city} spot is taken. That is the point.`
                : `The ${city} spot is open. It only goes to one of you.`}
            </h2>
            <p>
              Growth is capped at {industry.growthCap} {industry.name} businesses total, one per
              city — because we can&apos;t make you the name in {city} while also working for your
              competitor. Spots are never discounted to fill.
              {makeGood
                ? ` Growth carries ${makeGood.name.toLowerCase().startsWith('the') ? makeGood.name.charAt(0).toLowerCase() + makeGood.name.slice(1) : makeGood.name}: ${makeGood.promise.charAt(0).toLowerCase() + makeGood.promise.slice(1)}`
                : ''}
            </p>
            <p style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>
              Acknowledged in under {SERVICE_PROMISE.acknowledgeHours} hours · one number, call or
              text · you never lift a finger
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="ic-cta">
        <div className="wrap">
          <div className="panel panel--framed">
            <span className="eyebrow">Free — no call required</span>
            <h2>See who owns “{v.searchExamples[0]}” today.</h2>
            <p>
              The Local Domination Scorecard tears down the {city} search landscape for{' '}
              {industry.name.toLowerCase()}: who ranks, why, and what it takes to flip it.
            </p>
            <Link href="/scorecard" className="btn btn--primary">Get your free scorecard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
