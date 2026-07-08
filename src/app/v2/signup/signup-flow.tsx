'use client';

/**
 * Signup flow (client) — plan → industry/city → details → Stripe Checkout.
 * Identical for rep-assisted and (post–Gate 3) self-serve. All plan and
 * industry data comes from config via props-free imports (client-safe pure
 * data). Growth validates city exclusivity before checkout; the server
 * validates everything again.
 */
import { useMemo, useState } from 'react';
import {
  publicPlans,
  formatDollars,
  annualPrepayCents,
  ANNUAL_PREPAY,
  type PlanKey,
} from '@/config/pricing';
import { activeIndustries, citySpotStatus, spotsRemaining } from '@/config/industries';

type Billing = 'monthly' | 'annual';
type DomainPref = 'need_domain' | 'have_domain' | 'not_sure';

export function SignupFlow({ repAssisted, repUserId }: { repAssisted: boolean; repUserId: string | null }) {
  const plans = publicPlans();
  const industries = activeIndustries();

  const [planKey, setPlanKey] = useState<PlanKey | null>(null);
  const [billing, setBilling] = useState<Billing>('monthly');
  const [industrySlug, setIndustrySlug] = useState('');
  const [city, setCity] = useState('');
  const [business, setBusiness] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [domainPref, setDomainPref] = useState<DomainPref>('not_sure');
  const [existingDomain, setExistingDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const plan = plans.find((p) => p.key === planKey) ?? null;

  // Growth exclusivity — validated live as the rep types the city.
  const spotState = useMemo(() => {
    if (planKey !== 'growth' || !industrySlug || !city.trim()) return null;
    const status = citySpotStatus(industrySlug, city.trim());
    const remaining = spotsRemaining(industrySlug);
    return { status, remaining, ok: status === 'open' && remaining > 0 };
  }, [planKey, industrySlug, city]);

  const detailsValid =
    !!plan && !!industrySlug && city.trim().length > 1 && business.trim().length > 1 &&
    contactName.trim().length > 1 && /.+@.+\..+/.test(email) && phone.trim().length >= 7 &&
    (planKey !== 'growth' || (spotState?.ok ?? false));

  async function startCheckout() {
    if (!plan || !detailsValid) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/signup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: plan.key,
          billing,
          industry: industrySlug,
          city: city.trim(),
          business: business.trim(),
          contactName: contactName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          domainPref,
          existingDomain: domainPref === 'have_domain' ? existingDomain.trim() : '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json?.error ?? 'Could not start checkout. Please try again.');
        setSubmitting(false);
        return;
      }
      window.location.href = json.url as string;
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  const recurringCents = plan ? (billing === 'annual' ? annualPrepayCents(plan) : plan.monthlyCents) : 0;

  return (
    <section style={{ padding: '72px 0 110px' }}>
      <style>{`
        .su-head{margin-bottom:34px}
        .su-head .mode{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--steel);border:1px solid var(--navy-edge);border-radius:3px;padding:5px 10px}
        .su-grid{display:grid;grid-template-columns:1fr;gap:18px}
        @media(min-width:900px){.su-grid{grid-template-columns:repeat(3,1fr)}}
        .su-plan{padding:22px 20px;cursor:pointer;text-align:left;width:100%;background:linear-gradient(180deg,rgba(15,36,56,.72),rgba(10,25,41,.86));border:1px solid var(--navy-edge);border-radius:4px;color:var(--paper);font-family:var(--font-body);transition:border-color .2s}
        .su-plan:hover{border-color:var(--steel-dim)}
        .su-plan[aria-pressed="true"]{border-color:var(--amber)}
        .su-plan .nm{font-family:var(--font-display);font-weight:700;font-size:1.1rem}
        .su-plan .pr{font-family:var(--font-mono);font-size:1.3rem;margin-top:6px}
        .su-plan .pr small{font-size:.72rem;color:var(--steel)}
        .su-plan .st{font-family:var(--font-mono);font-size:.7rem;color:var(--steel-dim);margin-top:2px}
        .su-bill{display:inline-flex;border:1px solid var(--navy-edge);border-radius:4px;overflow:hidden;margin:22px 0 6px}
        .su-bill button{background:transparent;border:none;color:var(--steel);font-family:var(--font-mono);font-size:.74rem;letter-spacing:.08em;padding:11px 18px;cursor:pointer;min-height:44px}
        .su-bill button[aria-pressed="true"]{background:var(--navy-edge);color:var(--paper)}
        .su-bonus{font-family:var(--font-mono);font-size:.7rem;color:var(--amber);display:block;margin-bottom:8px}
        .su-sec{margin-top:34px}
        .su-sec h2{font-size:1.15rem;margin-bottom:16px}
        .su-row{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px}
        @media(min-width:680px){.su-row{grid-template-columns:1fr 1fr}}
        .su-spot{font-family:var(--font-mono);font-size:.74rem;margin-top:8px;padding:9px 12px;border-radius:3px;border:1px solid}
        .su-spot--ok{color:var(--amber);border-color:rgba(255,182,39,.4)}
        .su-spot--no{color:var(--clay);border-color:rgba(214,69,69,.45)}
        .su-pref{display:flex;flex-wrap:wrap;gap:10px}
        .su-pref button{background:transparent;border:1px solid var(--navy-edge);border-radius:4px;color:var(--steel);font-family:var(--font-mono);font-size:.72rem;letter-spacing:.06em;padding:11px 14px;cursor:pointer;min-height:44px}
        .su-pref button[aria-pressed="true"]{border-color:var(--amber);color:var(--paper)}
        .su-summary{margin-top:34px;padding:26px 24px}
        .su-line{display:flex;justify-content:space-between;font-size:.92rem;padding:7px 0;border-bottom:1px dashed rgba(78,112,143,.35)}
        .su-line span:last-child{font-family:var(--font-mono)}
        .su-total{display:flex;justify-content:space-between;padding-top:12px;font-family:var(--font-display);font-weight:700;font-size:1.05rem}
        .su-total span:last-child{font-family:var(--font-mono);color:var(--amber)}
      `}</style>
      <div className="wrap" style={{ maxWidth: 880 }}>
        <div className="su-head">
          <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Signup</span>
          <h1 style={{ fontSize: '2rem' }}>Let&apos;s set this up properly.</h1>
          <p style={{ marginTop: 10 }}>
            <span className="mode">{repAssisted ? 'Rep-assisted session' : 'Self-serve'}</span>
          </p>
        </div>

        {/* Step 1 — plan + billing */}
        <div className="su-sec">
          <h2><span className="num" style={{ color: 'var(--amber)' }}>01</span> · Pick the plan</h2>
          <div className="su-grid">
            {plans.map((p) => (
              <button
                key={p.key}
                type="button"
                className="su-plan"
                aria-pressed={planKey === p.key}
                onClick={() => setPlanKey(p.key)}
              >
                <span className="nm">{p.name}</span>
                <div className="pr num">{formatDollars(p.monthlyCents)}<small>/mo</small></div>
                <div className="st num">{p.setupCents > 0 ? `+ ${formatDollars(p.setupCents)} setup` : ''}</div>
              </button>
            ))}
          </div>
          <div className="su-bill" role="group" aria-label="Billing period">
            <button type="button" aria-pressed={billing === 'monthly'} onClick={() => setBilling('monthly')}>
              Monthly
            </button>
            <button type="button" aria-pressed={billing === 'annual'} onClick={() => setBilling('annual')}>
              Annual — {ANNUAL_PREPAY.framing}
            </button>
          </div>
          {billing === 'annual' && (
            <span className="su-bonus">
              {ANNUAL_PREPAY.monthsGranted} months of service for the price of {ANNUAL_PREPAY.monthsPaid} — a bonus month, not a discount.
            </span>
          )}
        </div>

        {/* Step 2 — industry + city (exclusivity check) */}
        <div className="su-sec">
          <h2><span className="num" style={{ color: 'var(--amber)' }}>02</span> · Industry & city</h2>
          <div className="su-row">
            <div>
              <label htmlFor="su-industry">Industry</label>
              <select id="su-industry" value={industrySlug} onChange={(e) => setIndustrySlug(e.target.value)}>
                <option value="" disabled>Select…</option>
                {industries.map((i) => (
                  <option key={i.slug} value={i.slug}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="su-city">City</label>
              <input id="su-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Calgary" />
            </div>
          </div>
          {spotState && (
            <div className={`su-spot ${spotState.ok ? 'su-spot--ok' : 'su-spot--no'}`} role="status">
              {spotState.ok
                ? `${city.trim()} is open — ${spotState.remaining} Growth spots left for this industry`
                : `${city.trim()} is not available for Growth in this industry — the spot is ${spotState.status}. Business is available city-unlimited.`}
            </div>
          )}
        </div>

        {/* Step 3 — client details */}
        <div className="su-sec">
          <h2><span className="num" style={{ color: 'var(--amber)' }}>03</span> · Client details</h2>
          <div className="su-row">
            <div>
              <label htmlFor="su-business">Business name</label>
              <input id="su-business" type="text" value={business} onChange={(e) => setBusiness(e.target.value)} />
            </div>
            <div>
              <label htmlFor="su-contact">Contact name</label>
              <input id="su-contact" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </div>
          <div className="su-row">
            <div>
              <label htmlFor="su-email">Email (receipt + account)</label>
              <input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="su-phone">Phone</label>
              <input id="su-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <label>Domain</label>
            <div className="su-pref" role="group" aria-label="Domain preference">
              <button type="button" aria-pressed={domainPref === 'need_domain'} onClick={() => setDomainPref('need_domain')}>
                Register a new one for me
              </button>
              <button type="button" aria-pressed={domainPref === 'have_domain'} onClick={() => setDomainPref('have_domain')}>
                I already have one
              </button>
              <button type="button" aria-pressed={domainPref === 'not_sure'} onClick={() => setDomainPref('not_sure')}>
                Not sure yet
              </button>
            </div>
            {domainPref === 'have_domain' && (
              <div style={{ marginTop: 12, maxWidth: 380 }}>
                <label htmlFor="su-domain">Current domain</label>
                <input id="su-domain" type="text" value={existingDomain} onChange={(e) => setExistingDomain(e.target.value)} placeholder="example.com" />
              </div>
            )}
          </div>
        </div>

        {/* Step 4 — summary + pay */}
        {plan && (
          <div className="panel panel--framed su-summary">
            <span className="eyebrow" style={{ display: 'block', marginBottom: 14 }}>Order summary</span>
            <div className="su-line">
              <span>{plan.name} — {billing === 'annual' ? `annual (${ANNUAL_PREPAY.framing})` : 'monthly'}</span>
              <span className="num">
                {formatDollars(recurringCents)}{billing === 'annual' ? '/yr' : '/mo'}
              </span>
            </div>
            {plan.setupCents > 0 && (
              <div className="su-line">
                <span>One-time setup</span>
                <span className="num">{formatDollars(plan.setupCents)}</span>
              </div>
            )}
            <div className="su-total">
              <span>Due today</span>
              <span className="num">{formatDollars(recurringCents + plan.setupCents)}</span>
            </div>
            {error && <p className="field-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
            <button
              type="button"
              className="btn btn--primary"
              style={{ width: '100%', marginTop: 22 }}
              disabled={!detailsValid || submitting}
              onClick={startCheckout}
            >
              {submitting ? 'Opening secure checkout…' : 'Continue to payment'}
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.68rem', color: 'var(--steel-dim)', textAlign: 'center', marginTop: 12 }}>
              Secure checkout by Stripe · setup fees are never waived or discounted
              {repAssisted && repUserId ? ' · rep session recorded' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
