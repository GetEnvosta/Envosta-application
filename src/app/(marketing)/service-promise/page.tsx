/**
 * /service-promise — the SLAs as verbatim commitments (charter §3, rebuild
 * brief Phase 2.5): the five-step intake loop visualized, per-plan edit
 * SLAs from config, and the covered-vs-paid boundary in plain language.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { publicPlans, SERVICE_PROMISE } from '@/config/pricing';

export const metadata: Metadata = {
  title: 'The Service Promise — Envosta',
  description:
    'Exact commitments, not vibes: every request acknowledged in under 4 hours, edits live in 1–2 business days by plan, site-down handled immediately. One number, call or text.',
  alternates: { canonical: 'https://envosta.com/service-promise' },
};

export default function ServicePromisePage() {
  const plans = publicPlans().filter((p) => p.editSlaBusinessDays != null);

  return (
    <div className="mk2">
      <style>{`
        .sp-hero{padding:88px 0 48px;text-align:center}
        .sp-hero p{max-width:620px;margin:16px auto 0;font-size:1.03rem;line-height:1.75}
        .sp-slas{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:800px){.sp-slas{grid-template-columns:repeat(4,1fr)}}
        .sp-sla{padding:26px 22px;text-align:center}
        .sp-sla .num{display:block;font-size:2rem;font-weight:600;color:var(--amber);margin-bottom:8px}
        .sp-sla p{font-size:.88rem;line-height:1.6}
        .sp-loop{padding-top:0}
        .sp-loop .steps{display:flex;flex-direction:column;gap:0;margin-top:26px;border-left:2px solid var(--navy-edge);margin-left:8px}
        .sp-step{position:relative;padding:0 0 26px 28px}
        .sp-step:last-child{padding-bottom:4px}
        .sp-step::before{content:'';position:absolute;left:-8px;top:4px;width:12px;height:12px;background:var(--navy-deep);border:2px solid var(--amber);border-radius:50%}
        .sp-step .n{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.18em;color:var(--amber);display:block;margin-bottom:4px}
        .sp-step p{color:var(--paper);font-size:.98rem}
        .sp-bound{padding-top:0;padding-bottom:100px}
        .sp-bound .grid{display:grid;grid-template-columns:1fr;gap:16px;margin-top:24px}
        @media(min-width:760px){.sp-bound .grid{grid-template-columns:1fr 1fr}}
        .sp-bound .col{padding:26px 24px}
        .sp-bound .col h3{margin-bottom:12px}
        .sp-bound ul{margin:0;padding-left:18px;color:var(--steel);font-size:.9rem;line-height:1.9}
      `}</style>

      <section className="sp-hero">
        <div className="wrap">
          <span className="eyebrow">The service promise</span>
          <h1>Commitments, <em>not vibes.</em></h1>
          <p>
            White-glove only means something if it is measured. These are the numbers we hold
            ourselves to on every plan — and the loop every request runs through, every time.
          </p>
        </div>
      </section>

      {/* ── The SLAs, verbatim ───────────────────────────────── */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sp-slas">
            <div className="panel sp-sla">
              <span className="num">&lt;{SERVICE_PROMISE.acknowledgeHours}h</span>
              <p>Every request acknowledged in under {SERVICE_PROMISE.acknowledgeHours} hours</p>
            </div>
            {plans.map((p) => (
              <div key={p.key} className="panel sp-sla">
                <span className="num">
                  &lt;{p.editSlaBusinessDays}{p.editSlaBusinessDays === 1 ? ' day' : ' days'}
                </span>
                <p>
                  {p.name} plan edits live in under {p.editSlaBusinessDays} business{' '}
                  {p.editSlaBusinessDays === 1 ? 'day' : 'days'}
                </p>
              </div>
            ))}
            <div className="panel sp-sla">
              <span className="num">Now</span>
              <p>Site-down: handled {SERVICE_PROMISE.siteDown}ly, ahead of everything else</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The five-step intake loop ────────────────────────── */}
      <section className="sp-loop">
        <div className="wrap">
          <div className="panel panel--framed" style={{ padding: '34px 32px' }}>
            <span className="eyebrow">How a request actually moves</span>
            <h2 style={{ marginTop: 10 }}>Five steps. Always confirmed.</h2>
            <div className="steps">
              {SERVICE_PROMISE.intakeSteps.map((step, i) => (
                <div key={step} className="sp-step">
                  <span className="n num">Step 0{i + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Covered vs. quoted ───────────────────────────────── */}
      <section className="sp-bound">
        <div className="wrap">
          <span className="eyebrow">What&apos;s covered</span>
          <h2 style={{ marginTop: 10 }}>{SERVICE_PROMISE.coveredBoundary}</h2>
          <div className="grid">
            <div className="panel col">
              <h3>Covered — just call or text</h3>
              <ul>
                <li>Text and photo swaps, hours, pricing updates</li>
                <li>New team members, services added to existing pages</li>
                <li>Seasonal banners, promotions wording, contact details</li>
                <li>Anything broken — always, immediately</li>
              </ul>
            </div>
            <div className="panel col">
              <h3>Quoted first — so there are no surprises</h3>
              <ul>
                <li>A full redesign or rebrand</li>
                <li>Whole new sections or custom features</li>
                <li>E-commerce builds and integrations</li>
                <li>Anything we think deserves a conversation before work starts</li>
              </ul>
            </div>
          </div>
          <p style={{ marginTop: 22, fontSize: '.9rem' }}>
            <Link href="/plans" style={{ color: 'var(--amber)' }}>
              See which plan carries which promise →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
