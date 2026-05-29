/**
 * /resellers — agency-focused landing page with custom-pricing lead form.
 *
 * Separate from /plans (self-serve tiers for individual sites). This page
 * targets agencies and freelancers managing multiple client sites. There
 * is no self-serve signup — every reseller customer is hand-onboarded
 * via the lead form below.
 *
 * Form submission → /api/contact with type='reseller' → creates a ticket
 * in /admin/tickets + emails sales@envosta.com.
 */
import { Server, Users, Sparkles, Headphones, Globe, Lock } from 'lucide-react';
import { ResellerLeadForm } from './reseller-lead-form';

export const metadata = {
  title: 'Reseller Hosting · Envosta',
  description: 'Bulk WordPress hosting for agencies and freelancers managing multiple client sites. Custom-priced, white-glove onboarding.',
};

export default function ResellersPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full mb-4">
              <Users className="w-3 h-3" /> For agencies & freelancers
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 mb-5">
              Hosting your clients<br />will thank you for.
            </h1>
            <p className="text-lg text-gray-600 mb-7 leading-relaxed">
              Bulk WordPress hosting for agencies. Starts at <strong>$517 CAD/mo for 50 client
              sites</strong> — the same per-site infra as Growth, with white-glove onboarding and
              consolidated billing. Need more than 50? We&apos;ll quote you.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium px-5 py-3 rounded-lg transition-colors"
            >
              Talk to us about your agency
            </a>
            <p className="text-xs text-gray-400 mt-3">
              We&apos;ll respond within one business day.
            </p>
          </div>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">What resellers get</h2>
          <p className="text-sm text-gray-500 mb-10">Built for shops managing client sites, not bulk-hosting commodity.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Feature
              icon={<Server className="w-5 h-5" />}
              title="Volume pricing, transparent"
              body="Pricing scales with your site count. The more clients you bring, the lower the per-site cost. No surprise overages."
            />
            <Feature
              icon={<Globe className="w-5 h-5" />}
              title="Built on wp.cloud (Automattic)"
              body="Same enterprise infrastructure that powers WordPress.com. Auto SSL, daily backups, DDoS protection, global edge cache — included on every site."
            />
            <Feature
              icon={<Sparkles className="w-5 h-5" />}
              title="One dashboard, every client"
              body="Manage every site you host from one admin. Provision new sites in seconds. Hand off branded credentials to your clients when ready."
            />
            <Feature
              icon={<Headphones className="w-5 h-5" />}
              title="Direct line to support"
              body="Skip the help-center maze. Dedicated point of contact for your agency, priority response on every ticket."
            />
            <Feature
              icon={<Lock className="w-5 h-5" />}
              title="Consolidated billing"
              body="One invoice for your entire portfolio. Pay us, bill your clients however you want — we stay invisible to them."
            />
            <Feature
              icon={<Users className="w-5 h-5" />}
              title="Hand-onboarding"
              body="We migrate your existing sites, set up DNS, and verify everything works before charging. You don't lift a finger."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing intent ─────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Starts at $517 CAD/mo · 50 sites</h2>
          <p className="text-base text-gray-600 leading-relaxed">
            Our Reseller tier starts at the same price as Growth — $517 CAD/mo — but gives you 50
            client sites instead of 25. That&apos;s about $10/site if you fill it. Need more than
            50 sites or higher-traffic plans? We&apos;ll size a custom quote based on your portfolio
            and the support level you want.
          </p>
        </div>
      </section>

      {/* ── Lead form ──────────────────────────────────────── */}
      <section id="contact" className="bg-gray-50/50">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tell us about your agency</h2>
            <p className="text-sm text-gray-500">
              We&apos;ll respond within one business day with a tailored quote.
            </p>
          </div>
          <ResellerLeadForm />
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}
