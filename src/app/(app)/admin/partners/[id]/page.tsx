import { getPartnerProfile, getPartnerClients, getPartnerCommissions, getPartnerEarningStats } from '@/services/partners';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Users, DollarSign, MapPin, Award } from 'lucide-react';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { PartnerActions } from '../partner-actions';

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getPartnerProfile(id);
  if (!profile) notFound();

  const [clients, commissions, earnings] = await Promise.all([
    getPartnerClients(id),
    getPartnerCommissions(id, 20),
    getPartnerEarningStats(id),
  ]);

  // Get ratings
  const supabase = await createClient();
  const { data: ratings } = await supabase
    .from('partner_ratings')
    .select('*, users:client_id(full_name, email)')
    .eq('partner_id', id)
    .order('created_at', { ascending: false });

  const currentTier = profile.avg_rating >= 4.5 ? '25%' : profile.avg_rating >= 4.0 ? '20%' : '15%';

  return (
    <div>
      <Link href="/admin/partners" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Partners
      </Link>

      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.full_name ?? ''} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">
                {(profile.full_name?.[0] ?? '?').toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-gray-900">{profile.full_name}</h1>
                <span className={statusColor(profile.status)}>{profile.status}</span>
                {profile.featured && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    <Award className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">{profile.email}</p>
              {profile.location && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </p>
              )}
            </div>
          </div>
          <PartnerActions userId={id} status={profile.status} featured={profile.featured} />
        </div>

        {profile.bio && <p className="text-sm text-gray-600 mt-4 mb-3">{profile.bio}</p>}

        <div className="flex flex-wrap gap-1.5">
          {(profile.specializations ?? []).map((s: string) => (
            <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">{s}</span>
          ))}
          {(profile.industries ?? []).map((i: string) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{i}</span>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Rating</span>
          </div>
          <p className="text-xl font-bold">{profile.avg_rating > 0 ? profile.avg_rating.toFixed(1) : '—'}</p>
          <p className="text-xs text-gray-400">{currentTier} commission tier</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-sky-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Clients</span>
          </div>
          <p className="text-xl font-bold">{clients.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">This Month</span>
          </div>
          <p className="text-xl font-bold">{formatCents(earnings.thisMonth, 'cad')}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">All Time</span>
          </div>
          <p className="text-xl font-bold">{formatCents(earnings.allTime, 'cad')}</p>
        </div>
      </div>

      {/* Clients */}
      {clients.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Clients ({clients.length})</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Sites</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Credits</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/customers/${c.id}`} className="hover:text-admin-600">
                        <p className="text-sm font-medium text-gray-900">{c.full_name ?? 'Unnamed'}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{c.sites_count}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{c.credit_balance}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ratings */}
      {ratings && ratings.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Ratings ({ratings.length})</h2>
          <div className="space-y-2">
            {ratings.map((r: any) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{r.users?.full_name ?? r.users?.email ?? 'Client'}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Commissions */}
      {commissions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Commissions</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Details</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissions.map((c: any) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{c.users?.full_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{c.notes ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-emerald-600 text-right">{formatCents(c.amount_cad, 'cad')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
