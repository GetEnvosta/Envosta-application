export const dynamic = 'force-dynamic';

import { getCustomerById, getCustomerRelatedData } from '@/services/admin';
import { formatDate, formatDateTime, formatCents, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { QuickInvoice } from '@/components/admin/quick-invoice';
import { ChargeCard } from '@/components/admin/charge-card';
import { ProvisionSiteButton } from '@/components/admin/provision-site-button';
import {
  ArrowLeft, Building2, Clock, CreditCard, ExternalLink, Globe,
  Mail, Phone, Server, Shield, User, FileText, Download, Layers,
  Check, AlertTriangle, Link2,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { AttachDomainSubscription } from '@/components/admin/attach-domain-subscription';
import { getUsageMeter, getUsageHistory } from '@/services/usage';
import { AdminCreditAdjust } from '@/components/admin/admin-credit-adjust';

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

  const [relatedData, usageMeter, usageHistory] = await Promise.all([
    getCustomerRelatedData(user.id),
    getUsageMeter(user.id),
    getUsageHistory(user.id, 10),
  ]);
  const { services, domains, subscriptions, invoices, logs } = relatedData;

  // Split subscriptions: hosting vs domain
  const hostingSubs = subscriptions.filter((s: any) => s.products?.type === 'hosting_plan' || (!s.products?.type && !((s.metadata as any)?.type === 'domain_renewal')));
  const domainSubs = subscriptions.filter((s: any) => s.products?.type === 'domain_tld' || (s.metadata as any)?.type === 'domain_renewal');

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* ── Customer Overview ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 mb-5">
          <Avatar name={user.full_name || user.email} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{user.full_name || 'Unnamed'}</h1>
              <span className={user.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>{user.role}</span>
            </div>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          {user.stripe_customer_id && (
            <a href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0">
              <ExternalLink className="w-3 h-3" /> Stripe
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoPill icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
          {user.company_name && <InfoPill icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={user.company_name} />}
          {user.phone && <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.phone} />}
          {user.timezone && <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label="Timezone" value={user.timezone} />}
          <InfoPill icon={<Shield className="w-3.5 h-3.5" />} label="Joined" value={formatDate(user.created_at)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <CountPill label="Sites" count={services.length} />
          <CountPill label="Domains" count={domains.length} />
          <CountPill label="Invoices" count={invoices.length} />
        </div>
      </div>

      {/* ── Billing Actions ── */}
      {user.stripe_customer_id && (
        <div className="mb-6 flex items-start gap-3 flex-wrap">
          <ChargeCard customerId={id} customerName={user.full_name || user.email} />
          <QuickInvoice stripeCustomerId={user.stripe_customer_id} customerName={user.full_name || user.email} />
        </div>
      )}

      {/* ── Sites & Hosting ── */}
      <div className="card overflow-hidden mb-6">
        <div className="section-card-header">
          <Server className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Sites ({services.length})</h2>
        </div>
        {services.length === 0 && hostingSubs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No sites or hosting subscriptions.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Sites with their linked subscription */}
            {services.map((s: any) => {
              const linkedSub = hostingSubs.find((sub: any) => sub.id === s.subscription_id);
              const siteDomain = domains.find((d: any) => d.site_id === s.id);
              return (
                <div key={s.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <Link href={`/admin/services/${s.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700">{s.label}</Link>
                    <span className={statusColor(s.status)}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-500">{s.products?.name ?? '\u2014'}</span>
                    {siteDomain && (
                      <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {siteDomain.domain_name}
                      </span>
                    )}
                    {linkedSub ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                        <Link2 className="w-3 h-3" />
                        Sub {linkedSub.status}
                        {linkedSub.billing_period && <span className="text-emerald-500">· {linkedSub.billing_period}</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> No subscription
                      </span>
                    )}
                    {linkedSub?.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${linkedSub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-admin-600 font-mono">{linkedSub.stripe_subscription_id.slice(-8)}</a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Orphaned hosting subscriptions (no site linked) */}
            {hostingSubs.filter((sub: any) => !services.find((s: any) => s.subscription_id === sub.id)).map((sub: any) => (
              <div key={sub.id} className="px-5 py-4 bg-amber-50/30">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-900">{sub.products?.name ?? 'Unknown plan'}</p>
                  <span className={statusColor(sub.status)}>{sub.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    {sub.billing_period && <span className="text-xs text-gray-400">{sub.billing_period}</span>}
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                      <AlertTriangle className="w-3 h-3" /> No site linked
                    </span>
                    {sub.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-admin-600 font-mono">{sub.stripe_subscription_id.slice(-8)}</a>
                    )}
                  </div>
                  {(sub.status === 'active' || sub.status === 'trialing') && (
                    <ProvisionSiteButton subscriptionId={sub.id} userId={user.id} planId={sub.product_id} planName={sub.products?.name ?? 'Unknown'} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Domains & Renewals ── */}
      <div className="card overflow-hidden mb-6">
        <div className="section-card-header">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Domains ({domains.length})</h2>
        </div>
        {domains.length === 0 && domainSubs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No domains or domain subscriptions.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Domains with their linked subscription */}
            {domains.map((d: any) => {
              const linkedSub = domainSubs.find((sub: any) => (sub.metadata as any)?.domain_name === d.domain_name);
              const linkedSite = services.find((s: any) => s.id === d.site_id);
              return (
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                    <span className={statusColor(d.status)}>{d.status}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {linkedSite && (
                      <Link href={`/admin/services/${linkedSite.id}`} className="text-xs text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
                        <Server className="w-3 h-3" /> {linkedSite.label}
                      </Link>
                    )}
                    {d.expires_at && <span className="text-xs text-gray-400">Exp {formatDate(d.expires_at)}</span>}
                    {d.auto_renew === false && <span className="text-xs text-amber-600">Auto-renew off</span>}
                    {linkedSub ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                        <Link2 className="w-3 h-3" />
                        Renewal {linkedSub.status}
                        {linkedSub.billing_period && <span className="text-emerald-500">· {linkedSub.billing_period}</span>}
                      </span>
                    ) : (
                      <AttachDomainSubscription domainName={d.domain_name} domainId={d.id} userId={user.id}
                        renewalSubId={null} compact />
                    )}
                    {linkedSub?.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${linkedSub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-admin-600 font-mono">{linkedSub.stripe_subscription_id.slice(-8)}</a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Orphaned domain subscriptions (no domain linked) */}
            {domainSubs.filter((sub: any) => {
              const dn = (sub.metadata as any)?.domain_name;
              return !dn || !domains.find((d: any) => d.domain_name === dn);
            }).map((sub: any) => {
              const dn = (sub.metadata as any)?.domain_name;
              return (
                <div key={sub.id} className="px-5 py-4 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">{dn ?? sub.products?.name ?? 'Domain renewal'}</p>
                    <span className={statusColor(sub.status)}>{sub.status}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {sub.billing_period && <span className="text-xs text-gray-400">{sub.billing_period}</span>}
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                      <AlertTriangle className="w-3 h-3" /> No domain linked
                    </span>
                    {sub.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-admin-600 font-mono">{sub.stripe_subscription_id.slice(-8)}</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Usage ── */}
      <div className="card overflow-hidden mb-6">
        <div className="section-card-header">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Usage This Cycle</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Used</p>
              <p className="text-lg font-semibold text-gray-900">{usageMeter.usage_this_cycle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Included</p>
              <p className="text-lg font-semibold text-gray-900">{usageMeter.included_credits}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Overage</p>
              <p className={`text-lg font-semibold ${usageMeter.current_overage > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {usageMeter.current_overage > 0 ? `$${usageMeter.current_overage}` : '—'}
              </p>
            </div>
          </div>

          <AdminCreditAdjust userId={user.id} />

          {usageHistory.entries.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent Usage</p>
              <div className="space-y-1.5">
                {usageHistory.entries.slice(0, 10).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-gray-600 truncate max-w-[250px]">{e.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 font-medium">+{Number(e.amount).toFixed(2)}</span>
                      <span className="text-gray-400 w-20 text-right">
                        {new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Invoices ── */}
      <div className="card overflow-hidden mb-6">
        <div className="section-card-header">
          <FileText className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Invoices ({invoices.length})</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No invoices.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => {
                  const meta = (inv.metadata as any) ?? {};
                  const pdfUrl = meta.invoice_pdf ?? null;
                  const viewUrl = inv.hosted_invoice_url ?? null;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3 text-gray-900">{inv.description || meta.description || 'Invoice'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{formatCents(inv.amount_cad ?? 0, 'cad')}</td>
                      <td className="px-5 py-3"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                      <td className="px-5 py-3">
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
        )}
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

function CountPill({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3.5 py-3 text-center">
      <p className="text-lg font-semibold text-gray-900">{count}</p>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
