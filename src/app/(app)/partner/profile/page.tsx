'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Star } from 'lucide-react';

const SPECIALIZATIONS = ['Web Design', 'E-commerce', 'SEO', 'Local Business', 'Marketing', 'Branding', 'Content', 'Development', 'WordPress', 'WooCommerce'];
const INDUSTRIES = ['Retail', 'Healthcare', 'Real Estate', 'Restaurants', 'Professional Services', 'Construction', 'Education', 'Non-Profit', 'Technology', 'Fitness'];

export default function PartnerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/partners/profile')
      .then((r) => r.json())
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/partners/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: profile.bio,
          specializations: profile.specializations,
          industries: profile.industries,
          portfolio_links: profile.portfolio_links,
          location: profile.location,
          setup_fee_range: profile.setup_fee_range,
          photo_url: profile.photo_url,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (!profile) return <div className="text-sm text-gray-500">Profile not found.</div>;

  const toggleTag = (field: 'specializations' | 'industries', tag: string) => {
    const current: string[] = profile[field] ?? [];
    setProfile({
      ...profile,
      [field]: current.includes(tag) ? current.filter((t: string) => t !== tag) : [...current, tag],
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Partner Profile</h1>
          <p className="text-sm text-gray-500">This is how clients see you in the marketplace.</p>
        </div>
        {profile.avg_rating > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">{profile.avg_rating.toFixed(1)}</span>
            <span className="text-gray-400">({profile.client_count} clients)</span>
          </div>
        )}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={profile.bio ?? ''}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          rows={4}
          placeholder="Tell potential clients about yourself, your experience, and what you specialize in..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none resize-none"
        />
      </div>

      {/* Specializations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((tag) => (
            <button key={tag} onClick={() => toggleTag('specializations', tag)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                (profile.specializations ?? []).includes(tag)
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300'
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Industries */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Industries Served</label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((tag) => (
            <button key={tag} onClick={() => toggleTag('industries', tag)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                (profile.industries ?? []).includes(tag)
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300'
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Location & Setup Fee */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={profile.location ?? ''}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            placeholder="e.g., Toronto, Canada"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Setup Fee Range</label>
          <input
            type="text"
            value={profile.setup_fee_range ?? ''}
            onChange={(e) => setProfile({ ...profile, setup_fee_range: e.target.value })}
            placeholder="e.g., $500–$2,000"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
          />
        </div>
      </div>

      {/* Photo URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo URL</label>
        <input
          type="url"
          value={profile.photo_url ?? ''}
          onChange={(e) => setProfile({ ...profile, photo_url: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
