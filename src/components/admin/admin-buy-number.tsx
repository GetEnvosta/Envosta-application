'use client';

import { useState } from 'react';
import { Loader2, Plus, Search, X, Phone } from 'lucide-react';

export function AdminBuyNumber() {
  const [open, setOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [searchingSites, setSearchingSites] = useState(false);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [country, setCountry] = useState('CA');
  const [areaCode, setAreaCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function searchSites() {
    if (!siteSearch.trim()) return;
    setSearchingSites(true);
    try {
      // Use search-users endpoint to find sites (search by site label via admin services)
      const res = await fetch(`/api/admin/search-sites?q=${encodeURIComponent(siteSearch.trim())}`);
      if (res.ok) setSites(await res.json());
      else setSites([]);
    } catch { setSites([]); }
    setSearchingSites(false);
  }

  async function searchNumbers() {
    if (!areaCode) return;
    setSearching(true);
    setNumbers([]);
    try {
      const res = await fetch(`/api/twilio/numbers/search?areaCode=${areaCode}&country=${country}`);
      const data = await res.json();
      setNumbers(Array.isArray(data) ? data : []);
    } catch { setNumbers([]); }
    setSearching(false);
  }

  async function buyNumber(phoneNumber: string) {
    if (!selectedSite) return;
    setBuying(phoneNumber);
    setResult(null);
    try {
      const res = await fetch('/api/admin/buy-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, siteId: selectedSite.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Purchased ${phoneNumber} for "${selectedSite.label}"` });
        setNumbers([]);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({ ok: false, msg: data.error || 'Purchase failed' });
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    }
    setBuying(null);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Buy Number
      </button>
    );
  }

  return (
    <div className="card p-5 mb-6 border-l-4 border-indigo-400 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Phone className="w-4 h-4 text-indigo-600" /> Buy Phone Number
        </h3>
        <button onClick={() => { setOpen(false); setResult(null); }}
          className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Site search */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Assign to Site</label>
        {selectedSite ? (
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-900">{selectedSite.label}</span>
            <span className="text-xs text-gray-400">{selectedSite.user_email || ''}</span>
            <button onClick={() => { setSelectedSite(null); setSites([]); }} className="ml-auto text-xs text-red-500">Change</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="text" value={siteSearch} onChange={e => setSiteSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchSites(); } }}
              placeholder="Search sites by name..." className="flex-1 input text-sm" />
            <button onClick={searchSites} disabled={searchingSites} className="btn-admin px-3">
              {searchingSites ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        {sites.length > 0 && !selectedSite && (
          <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-auto divide-y divide-gray-100">
            {sites.map((s: any) => (
              <button key={s.id} onClick={() => setSelectedSite(s)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 transition-colors">
                <span className="font-medium text-gray-900">{s.label}</span>
                <span className="text-gray-400 ml-2">{s.user_name || s.user_email || ''}</span>
                {s.twilio_phone_number && <span className="text-red-400 ml-2">(already has number)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Number search */}
      {selectedSite && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select value={country} onChange={e => setCountry(e.target.value)} className="input w-auto text-sm">
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
            <input type="text" value={areaCode} onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Area code (e.g. 403)" className="flex-1 input text-sm" />
            <button onClick={searchNumbers} disabled={searching || !areaCode} className="btn-admin px-3 text-xs">
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>

          {numbers.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-auto">
              {numbers.slice(0, 10).map((n: any) => (
                <div key={n.phoneNumber} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-mono font-medium text-gray-900">{n.friendlyName}</p>
                    <p className="text-xs text-gray-500">{n.locality}, {n.region}</p>
                  </div>
                  <button onClick={() => buyNumber(n.phoneNumber)} disabled={buying === n.phoneNumber}
                    className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50">
                    {buying === n.phoneNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy (2 cr/mo)'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result && (
        <p className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.msg}</p>
      )}
    </div>
  );
}
