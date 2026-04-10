import { getEffectiveUserId } from '@/services/auth';
import { getClientPartnerInfo } from '@/services/partners';
import { redirect } from 'next/navigation';
import { MapPin, Award } from 'lucide-react';

export default async function MyPartnerPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect('/auth/login');

  const partner = await getClientPartnerInfo(userId);

  if (!partner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">My Partner</h1>
          <p className="text-sm text-gray-500">You don't have a partner assigned yet.</p>
        </div>
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-700 mb-3">Browse the marketplace to find a partner who fits your needs.</p>
          <a href="/dashboard/marketplace" className="inline-flex px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors">
            Browse Partners
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">My Partner</h1>
        <p className="text-sm text-gray-500">Your assigned partner manages your account and handles support.</p>
      </div>

      {/* Partner Profile Card */}
      <div className="card p-6">
        <div className="flex items-start gap-4 mb-4">
          {partner.photo_url ? (
            <img src={partner.photo_url} alt={partner.full_name ?? ''} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">
              {(partner.full_name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-900">{partner.full_name}</h2>
              {partner.featured && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                  <Award className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            {partner.location && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5" /> {partner.location}
              </p>
            )}
            <p className="text-xs text-gray-400">{partner.client_count} client{partner.client_count !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {partner.bio && <p className="text-sm text-gray-600 mb-4">{partner.bio}</p>}

        {(partner.specializations ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {partner.specializations.map((tag: string) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          When you create a support ticket or studio request, it goes directly to your partner.
        </p>
      </div>
    </div>
  );
}
