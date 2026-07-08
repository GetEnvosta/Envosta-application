/**
 * /industries — the industries Envosta hosts (config-driven index).
 * Adding an industry in config/industries.ts adds it here with zero code
 * changes. Each card links to the per-industry/per-city landing template.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { activeIndustries, spotsRemaining } from '@/config/industries';

export const metadata: Metadata = {
  title: 'Industries We Host — Envosta',
  description:
    'Envosta only hosts the industries it chooses. Industry-specialized managed WordPress hosting with the site, SEO, and reviews built into every plan.',
  alternates: { canonical: 'https://envosta.com/v2/industries' },
};

/** Launch metro (charter: one metro cluster until Gate 3). */
const LAUNCH_CITY = { slug: 'calgary', name: 'Calgary' };

export default function IndustriesPage() {
  const industries = activeIndustries();

  return (
    <div className="mk2">
      <style>{`
        .in-hero{padding:88px 0 48px;text-align:center}
        .in-hero p{max-width:620px;margin:16px auto 0;font-size:1.02rem;line-height:1.7}
        .in-grid{display:grid;grid-template-columns:1fr;gap:18px;padding-bottom:96px}
        @media(min-width:760px){.in-grid{grid-template-columns:1fr 1fr}}
        .in-card{padding:30px 28px;display:flex;flex-direction:column}
        .in-card h2{font-size:1.4rem;margin-bottom:8px}
        .in-card .spots{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--amber);margin-bottom:14px}
        .in-card p{font-size:.92rem;line-height:1.7;flex:1}
        .in-card .svcs{font-family:var(--font-mono);font-size:.78rem;color:var(--steel);margin:16px 0 20px;line-height:1.8}
        .in-why{padding:0 0 96px}
        .in-why .panel{padding:34px 30px}
        .in-why p{max-width:760px;line-height:1.75;font-size:.95rem}
      `}</style>

      <section className="in-hero">
        <div className="wrap">
          <span className="eyebrow">Industries</span>
          <h1>We only host the industries <em>we choose.</em></h1>
          <p>
            Specialization is the whole point: because we host one kind of business, the site
            patterns, the service-area pages, and the review playbook are already built for your
            industry — and every plan includes them.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="in-grid">
            {industries.map((industry) => (
              <div key={industry.slug} className="panel in-card">
                <h2>{industry.name}</h2>
                <span className="spots num">
                  {spotsRemaining(industry.slug)} of {industry.growthCap} Growth spots open
                </span>
                <p>
                  Hosting built for {industry.vocabulary.businessNoun}s — the {industry.vocabulary.jobNoun}{' '}
                  that pay for it come from searches like “{industry.vocabulary.searchExamples[0]}”.
                  One {industry.vocabulary.businessNoun} per city holds the Growth spot.
                </p>
                <div className="svcs">
                  {industry.vocabulary.serviceExamples.slice(0, 4).join(' · ')}
                </div>
                <Link href={`/v2/${industry.slug}/${LAUNCH_CITY.slug}`} className="btn btn--ghost">
                  {industry.name} hosting in {LAUNCH_CITY.name} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="in-why" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="panel">
            <span className="eyebrow">What qualifies an industry</span>
            <p>
              An industry joins this list only when it passes four tests: people search for it
              locally with intent to hire, one good {industries[0]?.vocabulary.jobNoun.replace(/s$/, '') ?? 'job'}{' '}
              pays for the plan, trust decisions run on reviews, and the work maps to service
              areas. Construction trades are first. Legal and professional services are on the
              roadmap — same rules, their turn comes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
