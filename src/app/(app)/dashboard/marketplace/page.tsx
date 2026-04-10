'use client';

import { useState, useEffect } from 'react';
import { Loader2, Star, MapPin, Award, Users } from 'lucide-react';

interface Partner {
  user_id: string;
  full_name: string;
  bio: string;
  specializations: string[];
  industries: string[];
  location: string;
  setup_fee_range: string;
  photo_url: string;
  featured: boolean;
  avg_rating: number;
  client_count: number;
}

export default function MarketplacePage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    const params = filter ? `?specialization=${encodeURIComponent(filter)}` : '';
    fetch(`/api/partners/marketplace${params}`)
      .then((r) => r.json())
      .then(setPartners)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleConnect(partnerId: string) {
    setConnecting(partnerId);
    try {
      // For clients without a partner, directly assign via a change request
      // (or the API could handle direct assignment)
      const res = await fetch('/api/partners/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Selected partner from marketplace`, partnerId }),
      });
      if (res.ok) {
        window.location.href = '/dashboard/my-partner';
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(null);
    }
  }

  const SPECS = ['Web Design', 'E-commerce', 'SEO', 'Local Business', 'Marketing', 'Branding', 'WordPress', 'WooCommerce'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Partner Marketplace</h1>
        <p className="text-sm text-gray-500">Find a partner to help manage your Envosta platform.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            !filter ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          All
        </button>
        {SPECS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              filter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : partners.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No partners found</p>
          <p className="text-xs text-gray-400">Try a different filter or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {partners.map((p) => (
            <div key={p.user_id} className={`card p-5 relative ${p.featured ? 'ring-2 ring-sky-200' : ''}`}>
              {p.featured && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    <Award className="w-3 h-3" /> Featured
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.full_name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg">
                    {(p.full_name?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                  {p.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= Math.round(p.avg_rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : 'New'} ({p.client_count} client{p.client_count !== 1 ? 's' : ''})
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{p.bio}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {(p.specializations ?? []).slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>

              {p.setup_fee_range && (
                <p className="text-xs text-gray-400 mb-3">Setup fee: {p.setup_fee_range}</p>
              )}

              <button
                onClick={() => handleConnect(p.user_id)}
                disabled={connecting === p.user_id}
                className="w-full py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {connecting === p.user_id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Request This Partner'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
