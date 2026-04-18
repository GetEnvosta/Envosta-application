export const dynamic = 'force-dynamic';

import { getCustomerById, getCustomerRelatedData } from '@/services/admin';
import { formatDate, formatDateTime, formatCents, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { QuickInvoice } from '@/components/admin/quick-invoice';
import { ChargeCard } from '@/components/admin/charge-card';
import {
  ArrowLeft, Building2, Clock, CreditCard, ExternalLink, Globe,
  Mail, Phone, Server, Shield, User, FileText, Download, Layers,
  AlertTriangle, Link2, Zap, HardDrive, ArrowUpRight, PauseCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { AttachDomainSubscription } from '@/components/admin/attach-domain-subscription';

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

  // Calculate monthly total from sites
  const activeSites = services.filter((s: any) => s.status === 'active' || s.status === 'provisioning');
  const monthlyTotal = activeSites.reduce((sum: number, s: any) => sum + ((s.products as any)?.price_cad ?? 0), 0);

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* ── Customer Overview + Billing Actions ── */}
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
          <div className="flex items-center gap-2 shrink-0">
            {user.stripe_customer_id && (
              <>
                <ChargeCard customerId={id} customerName={user.full_name || user.email} />
                <QuickInvoice stripeCustomerId={user.stripe_customer_id} customerName={user.full_name || user.email} />
                <a href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3" /> Stripe
                </a>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoPill icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
          {user.company_name && <InfoPill icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={user.company_name} />}
          {user.phone && <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.phone} />}
          {user.timezone && <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label="Timezone" value={user.timezone} />}
          <InfoPill icon={<Shield className="w-3.5 h-3.5" />} label="Joined" value={formatDate(user.created_at)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <CountPill label="Sites" count={activeSites.length} />
          <CountPill label="Domains" count={domains.length} />
          <CountPill label="Monthly" value={formatCents(monthlyTotal, 'cad')} />
        </div>
      </div>

      {/* ── Sites ── */}
      <div className="card overflow-hidden mb-6">
        {/* Single header with subscription status */}
        <div className="section-card-header">
          <Server className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Sites ({activeSites.length})</h2>
          <div className="ml-auto flex items-center gap-3">
            {hostingSubs.length > 0 && (() => {
              const sub = hostingSubs[0] as any;
              return (
                <>
                  <span className={statusColor(sub.status)}>{sub.status}</span>
                  {sub.status === 'paused' && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <PauseCircle className="w-3 h-3" /> Paused
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-900">{formatCents(monthlyTotal, 'cad')}/mo</span>
                  {sub.stripe_subscription_id && (
                    <a href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-gray-400 hover:text-admin-600 font-mono">{sub.stripe_subscription_id.slice(-8)}</a>
                  )}
                </>
              );
            })()}
            {hostingSubs.length === 0 && (
              <span className="text-xs text-gray-400">No subscription</span>
            )}
          </div>
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
                    <div key={s.id} className={`px-5 py-4 ${isCancelled ? 'bg-red-50/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCancelled ? 'bg-red-50' : 'bg-blue-50'}`}>
                            <Server className={`w-4 h-4 ${isCancelled ? 'text-red-400' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/admin/services/${s.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700">
                                {s.label}
                              </Link>
                              <span className={statusColor(s.status)}>{s.status}</span>
                              {isCancelled && daysLeft > 0 && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{daysLeft}d recovery</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {plan && (
                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {plan.name}
                                </span>
                              )}
                              {siteDomain && (
                                <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> {siteDomain.domain_name}
                                </span>
                              )}
                              {s.server_region && <span className="text-xs text-gray-400">{s.server_region}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Plan price */}
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {plan?.price_cad ? formatCents(plan.price_cad, 'cad') : '—'}<span className="text-xs font-normal text-gray-400">/mo</span>
                            </p>
                          </div>
                          {/* Link to admin site detail */}
                          <Link href={`/admin/services/${s.id}`} className="text-gray-400 hover:text-admin-600 transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>

                      {/* Resource specs from plan */}
                      {plan && !isCancelled && (
                        <div className="ml-11 flex items-center gap-4 flex-wrap">
                          <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {planMeta.php_workers_default ?? (s.config as any)?.php_workers ?? 2} workers
                          </span>
                          <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                            <HardDrive className="w-3 h-3" /> {planMeta.storage_gb ?? (s.config as any)?.storage_gb ?? 25} GB
                          </span>
                          {s.stripe_subscription_item_id && (
                            <span className="text-[10px] text-gray-300 font-mono">item: {s.stripe_subscription_item_id.slice(-8)}</span>
                          )}
                          {s.wp_cloud_url && (
                            <a href={s.wp_cloud_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-admin-600 inline-flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> {s.wp_cloud_url.replace('https://', '')}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
      </div>

      {/* ── Domains & Renewals ── */}
      <div className="card overflow-hidden mb-6">
        <div className="section-card-header">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="section-card-title">Domains ({domains.length})</h2>
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
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                      <span className={statusColor(d.status)}>{d.status}</span>
                    </div>
                    {domainPrice > 0 && (
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCents(domainPrice, 'cad')}<span className="text-xs font-normal text-gray-400">/yr</span>
                      </p>
                    )}
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
                <div key={sub.id} className="px-5 py-4 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">{dn ?? sub.products?.name ?? 'Domain renewal'}</p>
                    <span className={statusColor(sub.status)}>{sub.status}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
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

function CountPill({ label, count, value }: { label: string; count?: number; value?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3.5 py-3 text-center">
      <p className="text-lg font-semibold text-gray-900">{value ?? count ?? 0}</p>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
