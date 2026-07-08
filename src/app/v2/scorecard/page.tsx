/**
 * /scorecard — the Local Domination Scorecard opt-in (the lead magnet;
 * rebuild brief Phase 2.4, offer spec §5). First-class product surface:
 * this is the top of the application funnel for every plan motion.
 */
import type { Metadata } from 'next';
import { activeIndustries } from '@/config/industries';
import { LEAD_MAGNET_NAME } from '@/config/offer';
import { ScorecardForm } from './scorecard-form';

export const metadata: Metadata = {
  title: 'Free Local Domination Scorecard — Envosta',
  description:
    'A free teardown of your search presence against every competitor in your city: who ranks, why, and what it takes to flip it. Built by hand, delivered in one business day.',
  alternates: { canonical: 'https://envosta.com/v2/scorecard' },
};

export default function ScorecardPage() {
  const industries = activeIndustries().map((i) => ({ slug: i.slug, name: i.name }));

  return (
    <div className="mk2">
      <style>{`
        .sc-hero{padding:88px 0 40px;text-align:center}
        .sc-hero p{max-width:600px;margin:16px auto 0;font-size:1.02rem;line-height:1.75}
        .sc-wrap{max-width:640px;margin:0 auto;padding:0 20px 40px}
        .sc-row{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:16px}
        @media(min-width:640px){.sc-row{grid-template-columns:1fr 1fr}}
        .sc-what{padding:24px 0 100px}
        .sc-what .grid{display:grid;grid-template-columns:1fr;gap:14px;max-width:640px;margin:0 auto;padding:0 20px}
        .sc-what .item{padding:18px 20px;display:flex;gap:14px;align-items:flex-start}
        .sc-what .item .n{font-family:var(--font-mono);font-size:.7rem;color:var(--amber);border:1px solid var(--navy-edge);border-radius:3px;padding:3px 7px;flex-shrink:0;margin-top:2px}
        .sc-what .item p{font-size:.88rem;line-height:1.6;color:var(--paper)}
        .sc-what .item p span{color:var(--steel);display:block}
      `}</style>

      <section className="sc-hero">
        <div className="wrap">
          <span className="eyebrow">Free · built by hand · one business day</span>
          <h1>The {LEAD_MAGNET_NAME}.</h1>
          <p>
            Type your trade and your city into Google — whoever shows up owns the calls. The
            scorecard shows you exactly who that is today, why they win, and what it takes to make
            it you.
          </p>
        </div>
      </section>

      <div className="sc-wrap">
        <ScorecardForm industries={industries} />
      </div>

      <section className="sc-what" style={{ paddingTop: 0 }}>
        <div className="grid">
          <div className="panel item">
            <span className="n num">01</span>
            <p>
              Your search presence, scored
              <span>Where you rank for the searches that pay — maps, organic, and reviews.</span>
            </p>
          </div>
          <div className="panel item">
            <span className="n num">02</span>
            <p>
              Your competitors, named
              <span>Who owns your city&apos;s searches right now and what they did to get there.</span>
            </p>
          </div>
          <div className="panel item">
            <span className="n num">03</span>
            <p>
              The gap, priced
              <span>What flipping the spot takes — and whether your city&apos;s exclusive spot is still open.</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
