/**
 * /signup/complete — post-checkout confirmation (Phase 3.1 step 5).
 * White-glove register from message one: what happens next is the
 * five-step onboarding, spelled out.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Welcome to Envosta',
  robots: { index: false, follow: false },
};

export default function SignupCompletePage() {
  return (
    <div className="mk2">
      <section style={{ padding: '110px 0 130px' }}>
        <div className="wrap" style={{ maxWidth: 660 }}>
          <div className="panel panel--framed" style={{ padding: '48px 40px' }}>
            <span className="eyebrow">Payment received</span>
            <h1 style={{ fontSize: '2rem', margin: '14px 0' }}>Welcome. We take it from here.</h1>
            <p style={{ lineHeight: 1.75, marginBottom: 26 }}>
              Your receipt is on its way by email. Here is exactly what happens next — you do not
              need to do anything:
            </p>
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
              {[
                'Your onboarding concierge reaches out within one business day — by call or text.',
                'We register or connect your domain (in your name — you own it).',
                'Your industry-specialized site gets built and reviewed with you.',
                'Google Business Profile, forms, and call tracking go live.',
                'You get one number to call or text, and your first monthly report on schedule.',
              ].map((step, i) => (
                <li key={step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span
                    className="num"
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '.72rem', color: 'var(--amber)',
                      border: '1px solid var(--navy-edge)', borderRadius: 3, padding: '3px 7px', flexShrink: 0,
                    }}
                  >
                    0{i + 1}
                  </span>
                  <span style={{ color: 'var(--paper)', fontSize: '.95rem', lineHeight: 1.6 }}>{step}</span>
                </li>
              ))}
            </ol>
            <p style={{ marginTop: 28, fontSize: '.88rem' }}>
              Questions in the meantime?{' '}
              <Link href="/support" style={{ color: 'var(--amber)' }}>We answer fast →</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
