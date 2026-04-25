export const dynamic = 'force-dynamic';

import { getCustomerById, getCustomerRelatedData } from '@/services/admin';
import { formatDate, formatDateTime, formatCents, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { InvoiceForm } from '@/components/admin/invoice-form';
import { ChargeCard } from '@/components/admin/charge-card';
import {
  ArrowLeft, Building2, Clock, ExternalLink, Globe,
  Phone, Server, Shield, User, FileText, Download,
  AlertTriangle, Link2, Zap, HardDrive, PauseCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { AttachDomainSubscription } from '@/components/admin/attach-domain-subscription';
import { ImpersonateButton } from '@/components/admin/impersonate-button';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCustomerById(id);

  if (!user) {
    return (
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <div className="card p-12 text-center">
          <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Customer not found.</p>
        </div>
      </div>
    );
  }

  const relatedData = await getCustomerRelatedData(user.id);
  const { services, domains, subscriptions, invoices, logs } = relatedData;

  // Split subscriptions: hosting vs domain
  const hostingSubs = subscriptions.filter((s: any) => {
    const meta = (s.metadata as any) ?? {};
    return meta.type !== 'domain_renewal' && meta.is_domain_purchase !== 'true' && s.products?.type !== 'domain_tld';
  });
  const domainSubs = subscriptions.filter((s: any) => s.products?.type === 'domain_tld' || (s.metadata as any)?.type === 'domain_renewal');

  // The subscription covers an allotment of sites; price is the sub's billing
  // period price, not a per-site sum.
  const activeSites = services.filter((s: any) => s.status === 'active' || s.status === 'provisioning');
  const primaryHostingSub = (hostingSubs[0] as any) ?? null;
  const hostingPlan = primaryHostingSub?.products as any;
  const hostingPeriod: string = primaryHostingSub?.billing_period ?? 'monthly';
  const periodLabel = hostingPeriod === 'yearly' ? '/yr' : '/mo';
  const hostingPrice = hostingPeriod === 'yearly'
    ? (hostingPlan?.price_yearly_cad ?? (hostingPlan?.price_cad ? hostingPlan.price_cad * 12 : 0))
    : (hostingPlan?.price_cad ?? 0);

  // How many sites this plan allows. Pulled from product metadata; falls back
  // to the first site's own product metadata if the subscription hasn't
  // resolved a hostingPlan yet.
  const sitesAllowed: number =
    (hostingPlan?.metadata as any)?.sites_allowed
    ?? ((activeSites[0]?.products as any)?.metadata as any)?.sites_allowed
    ?? null;
  const sitesUsed = activeSites.length;

  // Calculate annual total from domain subscriptions
  const annualDomainTotal = domainSubs.reduce((sum: number, sub: any) => sum + ((sub.products as any)?.price_cad ?? 0), 0);

  // Split invoices: domain renewals vs hosting. The Stripe webhook doesn't
  // currently store a strong link between invoice → subscription, so this is
  // best-effort. Signals (any one matches → domain):
  //   - invoice.subscription_id matches a domain sub's DB id
  //   - metadata.stripe_subscription_id matches a domain sub's stripe id
  //   - metadata.product_type === 'domain_tld' (set by newer webhook)
  //   - metadata flags from older code (type === 'domain_renewal', etc)
  //   - description contains the word "domain" or any of this customer's
  //     actual registered domain names
  //   - amount matches a known domain TLD product price for this customer
  const domainSubDbIds = new Set(domainSubs.map((s: any) => s.id).filter(Boolean));
  const domainSubStripeIds = new Set(
    domainSubs.map((s: any) => s.stripe_subscription_id).filter(Boolean)
  );
  const domainAmounts = new Set(
    domainSubs.map((s: any) => (s.products as any)?.price_cad).filter((n: any) => typeof n === 'number' && n > 0)
  );
  const domainNames = (domains ?? []).map((d: any) => String(d.domain_name || '').toLowerCase()).filter(Boolean);

  function isDomainInvoice(inv: any): boolean {
    const meta = (inv.metadata as any) ?? {};
    if (inv.subscription_id && domainSubDbIds.has(inv.subscription_id)) return true;
    if (meta.stripe_subscription_id && domainSubStripeIds.has(meta.stripe_subscription_id)) return true;
    if (meta.product_type === 'domain_tld' || meta.product_type === 'domain') return true;
    if (meta.type === 'domain_renewal') return true;
    if (meta.is_domain_purchase === 'true' || meta.is_domain_purchase === true) return true;
    if (meta.domain_name) return true;

    const desc = String(inv.description || '').toLowerCase();
    if (desc) {
      if (/\bdomain\b/.test(desc)) return true;
      if (/\b(?:com|ca|net|org|io|co|app|dev|store|shop|xyz|me|tech)\b/i.test(desc) && /\./.test(desc)) {
        // Has a TLD-looking token AND a dot — likely "<name>.<tld>"
        return true;
      }
      if (domainNames.some(d => d && desc.includes(d))) return true;
    }

    // Last resort: amount matches a known domain TLD price for this customer.
    if (domainAmounts.size > 0 && typeof inv.amount_cad === 'number' && domainAmounts.has(inv.amount_cad)) {
      return true;
    }
    return false;
  }

  const domainInvoices = invoices.filter(isDomainInvoice);
  const hostingInvoices = invoices.filter((inv: any) => !isDomainInvoice(inv));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        {user.role !== 'admin' && (
          <ImpersonateButton userId={id} label={user.full_name || user.email} />
        )}
      </div>

      {/* ── Sites (with customer identity hero) ── */}
      <div className="card overflow-hidden mb-6">
        {/* Hero: identity + actions */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <Avatar name={user.full_name || user.email} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">{user.full_name || 'Unnamed'}</h1>
                <span className={user.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>{user.role}</span>
              </div>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user.stripe_customer_id && (
                <>
                  <ChargeCard customerId={id} customerName={user.full_name || user.email} />
                  <InvoiceForm mode="quick" stripeCustomerId={user.stripe_customer_id} customerName={user.full_name || user.email} />
                  <a href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" /> Stripe
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Contact pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {user.company_name && <InfoPill icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={user.company_name} />}
            {user.phone && <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.phone} />}
            {user.timezone && <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label="Timezone" value={user.timezone} />}
            <InfoPill icon={<Shield className="w-3.5 h-3.5" />} label="Joined" value={formatDate(user.created_at)} />
          </div>
        </div>

        {/* Subscription band — every plan/billing-related fact lives here so
            the per-site rows below can stay clean. */}
        {hostingSubs.length > 0 ? (() => {
          const sub = hostingSubs[0] as any;
          const planName = (sub.products as any)?.name;
          return (
            <div className="px-5 py-4 bg-gray-50/60 border-b border-gray-100 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-900">Subscription</span>
              </div>
              {planName && (
                <span className="text-xs font-medium text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded">{planName}</span>
              )}
              <span className={statusColor(sub.status)}>{sub.status}</span>
              {sub.status === 'paused' && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <PauseCircle className="w-3 h-3" /> Paused
                </span>
              )}
              <span className="text-sm font-semibold text-gray-900">
                {formatCents(hostingPrice, 'cad')}{periodLabel}
              </span>
              {sitesAllowed != null && (
                <span
                  className={`text-xs font-medium ${
                    sitesUsed >= sitesAllowed ? 'text-amber-600' : 'text-gray-600'
                  }`}
                  title={
                    sitesUsed >= sitesAllowed
                      ? `Plan limit reached`
                      : `Plan allows ${sitesAllowed} site${sitesAllowed === 1 ? '' : 's'}`
                  }
                >
                  {sitesUsed} <span className="text-gray-300">of</span> {sitesAllowed} sites
                </span>
              )}
              {sub.stripe_subscription_id && (
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-admin-600 font-mono"
                >
                  <ExternalLink className="w-3 h-3" />
                  {sub.stripe_subscription_id.slice(-8)}
                </a>
              )}
            </div>
          );
        })() : (
          <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Subscription</span>
            <span className="text-xs text-gray-400">— No active subscription</span>
          </div>
        )}

        {/* Compact section header — just a count above the rows. */}
        <div className="section-card-header">
          <h2 className="section-card-title">Sites ({activeSites.length})</h2>
        </div>

        {/* Site list */}
        <div className="divide-y divide-gray-100">
              {services.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No sites.</div>
              ) : (
                services.map((s: any) => {
                  const plan = s.products as any;
                  const planMeta = (plan?.metadata as any) ?? {};
                  const siteDomain = domains.find((d: any) => d.site_id === s.id);
                  const siteMeta = (s.metadata as any) ?? {};
                  const isCancelled = s.status === 'cancelled';
                  const recoveryDeadline = siteMeta.recovery_deadline ? new Date(siteMeta.recovery_deadline) : null;
                  const daysLeft = recoveryDeadline ? Math.max(0, Math.ceil((recoveryDeadline.getTime() - Date.now()) / 86400000)) : 0;

                  return (
                    <Link
                      key={s.id}
                      href={`/admin/services/${s.id}`}
                      className={`block px-5 py-3 transition-colors ${isCancelled ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCancelled ? 'bg-red-50' : 'bg-blue-50'}`}>
                          <Server className={`w-3.5 h-3.5 ${isCancelled ? 'text-red-400' : 'text-blue-600'}`} />
                        </div>
                        <span className="text-sm font-medium text-admin-600 truncate">{s.label}</span>
                        <span className={statusColor(s.status)}>{s.status}</span>
                        {isCancelled && daysLeft > 0 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{daysLeft}d recovery</span>
                        )}
                        {siteDomain && (
                          <span className="text-xs text-gray-400 inline-flex items-center gap-1 truncate">
                            <Globe className="w-3 h-3" /> {siteDomain.domain_name}
                          </span>
                        )}
                        {plan && !isCancelled && (
                          <>
                            <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                              <Zap className="w-3 h-3" /> {planMeta.php_workers_default ?? (s.config as any)?.php_workers ?? 2}w
                            </span>
                            <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                              <HardDrive className="w-3 h-3" /> {planMeta.storage_gb ?? (s.config as any)?.storage_gb ?? 25}GB
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

        {/* Hosting invoices — collapsible */}
        <InvoicesDropdown title="Hosting invoices" invoices={hostingInvoices} />
      </div>

      {/* ── Domains & Renewals ── */}
      <div className="card overflow-hidden mb-6">
        <div className="section-card-header">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Domains ({domains.length})</h2>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {domainSubs.length > 0 ? (
              <>
                {(() => {
                  const activeCount = domainSubs.filter((s: any) => s.status === 'active' || s.status === 'trialing').length;
                  return (
                    <span className="text-xs text-gray-500">
                      {activeCount} of {domainSubs.length} renewing
                    </span>
                  );
                })()}
                {annualDomainTotal > 0 && (
                  <span className="text-sm font-semibold text-gray-900">{formatCents(annualDomainTotal, 'cad')}/yr</span>
                )}
              </>
            ) : (
              domains.length > 0 && <span className="text-xs text-gray-400">No renewals attached</span>
            )}
          </div>
        </div>
        {domains.length === 0 && domainSubs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No domains.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {domains.map((d: any) => {
              const linkedSub = domainSubs.find((sub: any) =>
                (sub.metadata as any)?.domain_name === d.domain_name ||
                sub.stripe_subscription_id === d.renewal_stripe_subscription_id ||
                sub.stripe_subscription_id === (d.metadata as any)?.renewal_stripe_subscription_id
              );
              const linkedSite = services.find((s: any) => s.id === d.site_id);
              const domainPrice = (linkedSub?.products as any)?.price_cad ?? 0;
              return (
                <div key={d.id} className="px-5 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                    <span className={statusColor(d.status)}>{d.status}</span>
                    {linkedSite && (
                      <Link href={`/admin/services/${linkedSite.id}`} className="text-xs text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
                        <Server className="w-3 h-3" /> {linkedSite.label}
                      </Link>
                    )}
                    {d.expires_at && <span className="text-xs text-gray-400">Exp {formatDate(d.expires_at)}</span>}
                    {d.auto_renew === false && <span className="text-xs text-amber-600">Auto-renew off</span>}
                    {linkedSub ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                        <Link2 className="w-3 h-3" /> Renewal {linkedSub.status}
                      </span>
                    ) : (
                      <AttachDomainSubscription domainName={d.domain_name} domainId={d.id} userId={user.id} renewalSubId={null} compact />
                    )}
                    {linkedSub?.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${linkedSub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-admin-600 font-mono">{linkedSub.stripe_subscription_id.slice(-8)}</a>
                    )}
                    <div className="ml-auto shrink-0">
                      {domainPrice > 0 && (
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {formatCents(domainPrice, 'cad')}<span className="text-xs font-normal text-gray-400">/yr</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Orphaned domain subscriptions */}
            {domainSubs.filter((sub: any) => {
              const dn = (sub.metadata as any)?.domain_name;
              return !domains.find((d: any) =>
                d.domain_name === dn ||
                sub.stripe_subscription_id === d.renewal_stripe_subscription_id ||
                sub.stripe_subscription_id === (d.metadata as any)?.renewal_stripe_subscription_id
              );
            }).map((sub: any) => {
              const dn = (sub.metadata as any)?.domain_name;
              return (
                <div key={sub.id} className="px-5 py-3 bg-amber-50/30">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-900">{dn ?? sub.products?.name ?? 'Domain renewal'}</p>
                    <span className={statusColor(sub.status)}>{sub.status}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                      <AlertTriangle className="w-3 h-3" /> No domain linked
                    </span>
                    {sub.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-admin-600 font-mono ml-auto">{sub.stripe_subscription_id.slice(-8)}</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Domain invoices — collapsible */}
        <InvoicesDropdown title="Domain invoices" invoices={domainInvoices} />
      </div>

      {/* ── Recent Activity ── */}
      <div className="card overflow-hidden">
        <div className="section-card-header">
          <h2 className="section-card-title">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No activity recorded.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400 shrink-0 ml-4 font-mono">{formatDateTime(log.created_at)}</span>
                </div>
                {log.message && <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InvoicesDropdown({ title, invoices }: { title: string; invoices: any[] }) {
  if (!invoices || invoices.length === 0) {
    return (
      <details className="border-t border-gray-100">
        <summary className="px-5 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-500 select-none">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium">{title}</span>
          <span className="ml-auto text-xs text-gray-400">No invoices</span>
        </summary>
      </details>
    );
  }
  const totalPaid = invoices
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + (inv.amount_cad ?? 0), 0);
  return (
    <details className="border-t border-gray-100 group">
      <summary className="px-5 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm select-none">
        <FileText className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium text-gray-900">{title}</span>
        <span className="text-xs text-gray-500">({invoices.length})</span>
        <span className="ml-auto text-xs text-gray-500">
          {formatCents(totalPaid, 'cad')} paid
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-gray-100 bg-gray-50/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-5 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv: any) => {
              const meta = (inv.metadata as any) ?? {};
              const pdfUrl = meta.invoice_pdf ?? null;
              const viewUrl = inv.hosted_invoice_url ?? null;
              return (
                <tr key={inv.id} className="hover:bg-white">
                  <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap text-xs">{formatDate(inv.created_at)}</td>
                  <td className="px-5 py-2.5 text-gray-900 text-xs">{inv.description || meta.description || 'Invoice'}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-900 whitespace-nowrap text-xs">{formatCents(inv.amount_cad ?? 0, 'cad')}</td>
                  <td className="px-5 py-2.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-admin-600 hover:text-admin-700 inline-flex items-center gap-1 text-xs font-medium"><Download className="w-3 h-3" /> PDF</a>}
                      {viewUrl && <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 text-xs"><FileText className="w-3 h-3" /> View</a>}
                      {!pdfUrl && !viewUrl && <span className="text-gray-400">&mdash;</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

