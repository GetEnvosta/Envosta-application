'use client';

import { useState, useEffect } from 'react';
import {
  Phone, Plus, Search, Loader2, Trash2, Settings, ChevronDown,
  ChevronUp, Mic, PhoneOff, Link2, Unlink,
} from 'lucide-react';

interface PhoneNumber {
  id: string;
  phone_number: string;
  enabled: boolean;
  config: any;
  site_id: string | null;
  twilio_sid: string;
  created_at: string;
  sites?: { id: string; label: string } | null;
}

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

export function PhoneNumbersDashboard() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuy, setShowBuy] = useState(false);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [configData, setConfigData] = useState<any>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Buy flow
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchCountry, setSearchCountry] = useState('CA');
  const [searching, setSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);

  useEffect(() => { loadNumbers(); }, []);

  async function loadNumbers() {
    try {
      const res = await fetch('/api/phone-numbers');
      const data = await res.json();
      setNumbers(data.numbers ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

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
      const res = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: number }),
      });
      if (res.ok) {
        setShowBuy(false);
        setAvailableNumbers([]);
        setSearchAreaCode('');
        await loadNumbers();
      }
    } catch (e) { console.error(e); }
    setBuying(null);
  }

  async function releaseNumber(id: string) {
    if (!confirm('Release this number permanently? You\'ll lose it forever and stop being charged. This cannot be undone.')) return;
    setReleasing(id);
    try {
      const res = await fetch(`/api/phone-numbers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNumbers(prev => prev.filter(n => n.id !== id));
        if (configuring === id) { setConfiguring(null); setConfigData(null); }
      }
    } catch (e) { console.error(e); }
    setReleasing(null);
  }

  async function toggleEnabled(id: string, currentEnabled: boolean) {
    try {
      await fetch(`/api/phone-numbers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      setNumbers(prev => prev.map(n => n.id === id ? { ...n, enabled: !currentEnabled } : n));
    } catch (e) { console.error(e); }
  }

  async function openConfig(id: string) {
    if (configuring === id) { setConfiguring(null); setConfigData(null); setCalls([]); return; }
    setConfiguring(id);
    setConfigData(null);
    setCalls([]);
    setSaved(false);
    try {
      const res = await fetch(`/api/phone-numbers/${id}`);
      const data = await res.json();
      setConfigData({
        business_name: data.config?.business_name ?? '',
        business_hours: data.config?.business_hours ?? '',
        services_offered: data.config?.services_offered ?? '',
        booking_instructions: data.config?.booking_instructions ?? '',
        greeting_message: data.config?.greeting_message ?? '',
        custom_prompt: data.config?.custom_prompt ?? '',
        voice: data.config?.voice ?? 'Google.en-US-Journey-F',
        max_call_minutes: data.config?.max_call_minutes ?? 6,
      });
      setCalls(data.calls ?? []);
    } catch (e) { console.error(e); }
  }

  async function saveConfig() {
    if (!configuring || !configData) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/phone-numbers/${configuring}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  const inputClass = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Phone Numbers</h1>
          {numbers.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              {numbers.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowBuy(!showBuy)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Get a Number
        </button>
      </div>

      {/* Buy Number Panel */}
      {showBuy && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Search Available Numbers</h3>
          </div>
          <div className="flex gap-2">
            <select
              value={searchCountry}
              onChange={e => setSearchCountry(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg"
            >
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
            <input
              type="text"
              placeholder="Area code (e.g. 403)"
              value={searchAreaCode}
              onChange={e => setSearchAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-900 outline-none"
              onKeyDown={e => e.key === 'Enter' && searchNumbers()}
            />
            <button
              onClick={searchNumbers}
              disabled={searching || !searchAreaCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Search
            </button>
          </div>

          {availableNumbers.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-auto">
              {availableNumbers.slice(0, 10).map((n: any) => (
                <div key={n.phoneNumber} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-mono font-medium text-gray-900">{n.friendlyName}</p>
                    <p className="text-xs text-gray-500">{n.locality}, {n.region}</p>
                  </div>
                  <button
                    onClick={() => buyNumber(n.phoneNumber)}
                    disabled={buying === n.phoneNumber}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {buying === n.phoneNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy (2 cr/mo)'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            2 credits/month for the phone number. AI receptionist calls billed at 2 credits/min + AI token usage.
          </p>
        </div>
      )}

      {/* Empty State */}
      {numbers.length === 0 && !showBuy && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Phone className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-base font-medium text-gray-900">No phone numbers yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5 max-w-sm">
            Get a local phone number with an AI receptionist that answers calls 24/7, captures leads, and books appointments.
          </p>
          <button
            onClick={() => setShowBuy(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Get a Number
          </button>
        </div>
      )}

      {/* Numbers List */}
      {numbers.length > 0 && (
        <div className="space-y-3">
          {numbers.map((num) => (
            <div key={num.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Number Row */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${num.enabled ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                    {num.enabled
                      ? <Phone className="w-5 h-5 text-emerald-600" />
                      : <PhoneOff className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-mono font-semibold text-gray-900">{num.phone_number}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-xs font-medium ${num.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {num.enabled ? 'Active' : 'Disabled'}
                      </span>
                      {num.sites ? (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {num.sites.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Unlink className="w-3 h-3" />
                          Not linked to a site
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Added {new Date(num.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnabled(num.id, num.enabled)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      num.enabled
                        ? 'text-amber-700 hover:bg-amber-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {num.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openConfig(num.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      configuring === num.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                  </button>
                  <button
                    onClick={() => releaseNumber(num.id)}
                    disabled={releasing === num.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {releasing === num.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Release
                  </button>
                </div>
              </div>

              {/* Config Panel (expandable) */}
              {configuring === num.id && configData && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Business Name</label>
                      <input
                        type="text"
                        value={configData.business_name}
                        onChange={e => setConfigData({ ...configData, business_name: e.target.value })}
                        className={inputClass}
                        placeholder="Your Business"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Business Hours</label>
                      <input
                        type="text"
                        value={configData.business_hours}
                        onChange={e => setConfigData({ ...configData, business_hours: e.target.value })}
                        className={inputClass}
                        placeholder="Mon-Fri 9am-5pm MST"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Greeting Message</label>
                    <input
                      type="text"
                      value={configData.greeting_message}
                      onChange={e => setConfigData({ ...configData, greeting_message: e.target.value })}
                      className={inputClass}
                      placeholder={`Thanks for calling ${configData.business_name || 'us'}! How can I help?`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Services Offered</label>
                    <textarea
                      value={configData.services_offered}
                      onChange={e => setConfigData({ ...configData, services_offered: e.target.value })}
                      className={inputClass + ' resize-none'}
                      rows={2}
                      placeholder="List your services so the AI can describe them to callers..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Booking Instructions</label>
                    <textarea
                      value={configData.booking_instructions}
                      onChange={e => setConfigData({ ...configData, booking_instructions: e.target.value })}
                      className={inputClass + ' resize-none'}
                      rows={2}
                      placeholder="How should the AI handle appointment requests?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Custom AI Instructions <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      value={configData.custom_prompt}
                      onChange={e => setConfigData({ ...configData, custom_prompt: e.target.value })}
                      className={inputClass + ' resize-none'}
                      rows={2}
                      placeholder="Any additional instructions for the AI receptionist..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Voice</label>
                      <select
                        value={configData.voice}
                        onChange={e => setConfigData({ ...configData, voice: e.target.value })}
                        className={inputClass}
                      >
                        {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Max Call Duration (min)</label>
                      <input
                        type="number"
                        value={configData.max_call_minutes}
                        min={1}
                        max={6}
                        onChange={e => setConfigData({ ...configData, max_call_minutes: Math.min(6, Math.max(1, parseInt(e.target.value) || 1)) })}
                        className={inputClass}
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Max 6 minutes per call</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={saveConfig}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      {saved ? 'Saved!' : 'Save Configuration'}
                    </button>
                  </div>

                  {/* Call History */}
                  {calls.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Mic className="w-3 h-3" /> Recent Calls
                      </p>
                      <div className="space-y-1.5">
                        {calls.map((call) => (
                          <div key={call.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white">
                            <button
                              onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-mono text-gray-700">{call.caller}</span>
                                <span className="text-xs text-gray-400">{call.duration_minutes}min</span>
                                <span className="text-xs text-blue-600 font-medium">{call.credits_charged} cr</span>
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
                                      t.speaker === 'ai' ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-700'
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
