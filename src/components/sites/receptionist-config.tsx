'use client';

import { useState, useEffect } from 'react';
import { Loader2, Phone, PhoneOff, Search, Trash2, ChevronDown, ChevronUp, Mic } from 'lucide-react';

interface CallRecord {
  id: string;
  caller: string;
  duration_minutes: number;
  credits_charged: number;
  transcript: { speaker: string; text: string }[];
  created_at: string;
}

const VOICES = [
  { id: 'Google.en-US-Journey-F', label: 'Journey (Female)' },
  { id: 'Google.en-US-Journey-D', label: 'Journey (Male)' },
  { id: 'Google.en-US-Wavenet-F', label: 'Wavenet (Female)' },
  { id: 'Google.en-US-Wavenet-D', label: 'Wavenet (Male)' },
  { id: 'Google.en-US-Neural2-F', label: 'Neural (Female)' },
  { id: 'Google.en-US-Neural2-D', label: 'Neural (Male)' },
];

export function ReceptionistConfig({ siteId, siteLabel }: { siteId: string; siteLabel?: string }) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState({
    business_name: siteLabel ?? '',
    business_hours: '',
    services_offered: '',
    booking_instructions: '',
    greeting_message: '',
    custom_prompt: '',
    voice: 'Google.en-US-Journey-F',
    max_call_minutes: 6,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Number search state
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchCountry, setSearchCountry] = useState('CA');
  const [searching, setSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Call history state
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/twilio/config?siteId=${siteId}`).then(r => r.json()),
      fetch(`/api/twilio/calls?siteId=${siteId}&limit=10`).then(r => r.json()),
    ]).then(([configData, callsData]) => {
      setPhoneNumber(configData.phone_number ?? null);
      setEnabled(configData.enabled ?? false);
      if (configData.config && Object.keys(configData.config).length > 0) {
        setConfig(prev => ({ ...prev, ...configData.config }));
      }
      setCalls(callsData.calls ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [siteId]);

  async function searchNumbers() {
    if (!searchAreaCode) return;
    setSearching(true);
    setAvailableNumbers([]);
    try {
      const res = await fetch(`/api/twilio/numbers/search?areaCode=${searchAreaCode}&country=${searchCountry}`);
      const data = await res.json();
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setSearching(false);
  }

  async function buyNumber(number: string) {
    setBuying(number);
    try {
      const res = await fetch('/api/twilio/numbers/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: number, siteId }),
      });
      if (res.ok) {
        setPhoneNumber(number);
        setEnabled(true);
        setAvailableNumbers([]);
      }
    } catch (e) { console.error(e); }
    setBuying(null);
  }

  async function releaseNumber() {
    if (!confirm('Release this phone number? It cannot be recovered.')) return;
    setReleasing(true);
    try {
      const res = await fetch('/api/twilio/numbers/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      if (res.ok) {
        setPhoneNumber(null);
        setEnabled(false);
      }
    } catch (e) { console.error(e); }
    setReleasing(false);
  }

  async function saveConfig() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/twilio/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, enabled, config }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded" />;

  const inputClass = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-900">AI Receptionist</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-3">
        AI-powered phone receptionist that answers calls 24/7, captures leads, and books appointments.
        Billed at 2 credits/min + AI token usage.
      </p>

      {/* ── Phone Number ── */}
      {!phoneNumber ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">Get a phone number</p>
          <div className="flex gap-2">
            <select value={searchCountry} onChange={e => setSearchCountry(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
            <input type="text" placeholder="Area code (e.g. 403)" value={searchAreaCode}
              onChange={e => setSearchAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 outline-none" />
            <button onClick={searchNumbers} disabled={searching || !searchAreaCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50">
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Search
            </button>
          </div>
          {availableNumbers.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {availableNumbers.slice(0, 10).map((n: any) => (
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
          <p className="text-[10px] text-gray-400">2 credits/month for the phone number. Calls billed separately.</p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <div>
              <p className="text-sm font-mono font-medium text-gray-900">{phoneNumber}</p>
              <p className="text-xs text-gray-500">{enabled ? 'Active — receiving calls' : 'Inactive'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEnabled(!enabled); }} className={`px-3 py-1 text-xs font-medium rounded-md ${enabled ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
              {enabled ? 'Disable' : 'Enable'}
            </button>
            <button onClick={releaseNumber} disabled={releasing}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md">
              {releasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Configuration ── */}
      {phoneNumber && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Business Name</label>
              <input type="text" value={config.business_name} onChange={e => setConfig({ ...config, business_name: e.target.value })}
                className={inputClass} placeholder={siteLabel ?? 'Your Business'} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Business Hours</label>
              <input type="text" value={config.business_hours} onChange={e => setConfig({ ...config, business_hours: e.target.value })}
                className={inputClass} placeholder="Mon-Fri 9am-5pm MST" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Greeting Message</label>
            <input type="text" value={config.greeting_message} onChange={e => setConfig({ ...config, greeting_message: e.target.value })}
              className={inputClass} placeholder={`Thanks for calling ${config.business_name || siteLabel || 'us'}! How can I help?`} />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Services Offered</label>
            <textarea value={config.services_offered} onChange={e => setConfig({ ...config, services_offered: e.target.value })}
              className={inputClass + ' resize-none'} rows={2} placeholder="List your services..." />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Booking Instructions</label>
            <textarea value={config.booking_instructions} onChange={e => setConfig({ ...config, booking_instructions: e.target.value })}
              className={inputClass + ' resize-none'} rows={2} placeholder="How should the AI handle appointments?" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Custom AI Instructions (optional)</label>
            <textarea value={config.custom_prompt} onChange={e => setConfig({ ...config, custom_prompt: e.target.value })}
              className={inputClass + ' resize-none'} rows={2} placeholder="Any extra instructions for the AI..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Voice</label>
              <select value={config.voice} onChange={e => setConfig({ ...config, voice: e.target.value })} className={inputClass}>
                {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Call Duration (min)</label>
              <input type="number" value={config.max_call_minutes} min={1} max={6}
                onChange={e => setConfig({ ...config, max_call_minutes: Math.min(6, Math.max(1, parseInt(e.target.value) || 1)) })}
                className={inputClass} />
              <p className="text-[10px] text-gray-400 mt-0.5">Max 6 minutes per call</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveConfig} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saved ? 'Saved!' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* ── Recent Calls ── */}
      {calls.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Mic className="w-3 h-3" /> Recent Calls
          </p>
          <div className="space-y-1.5">
            {calls.map((call) => (
              <div key={call.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-mono text-gray-700">{call.caller}</span>
                    <span className="text-xs text-gray-400">{call.duration_minutes}min</span>
                    <span className="text-xs text-brand-600 font-medium">{call.credits_charged} cr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">
                      {new Date(call.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {expandedCall === call.id ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                  </div>
                </button>
                {expandedCall === call.id && call.transcript?.length > 0 && (
                  <div className="px-3 pb-3 border-t border-gray-50 space-y-1.5 max-h-48 overflow-auto">
                    {call.transcript.map((t, i) => (
                      <div key={i} className={`flex ${t.speaker === 'ai' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
                          t.speaker === 'ai' ? 'bg-brand-50 text-brand-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <span className="font-medium text-[10px] text-gray-400 block mb-0.5">
                            {t.speaker === 'ai' ? 'AI' : 'Caller'}
                          </span>
                          {t.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
