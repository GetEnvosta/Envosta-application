'use client';

import { useState, useEffect } from 'react';
import {
  Phone, Loader2, Search, Trash2, ChevronDown, ChevronUp,
  Mic, MessageSquare, Settings, Send, ExternalLink, PhoneOff,
} from 'lucide-react';

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

export function AdminPhone() {
  const [config, setConfig] = useState({
    phone_number: '',
    twilio_sid: '',
    enabled: false,
    business_name: 'Envosta',
    business_hours: 'Mon-Fri 9am-5pm MST',
    services_offered: 'Managed WordPress Hosting, Domain Registration, Website Design, SEO',
    booking_instructions: '',
    greeting_message: 'Thanks for calling Envosta! How can I help you today?',
    custom_prompt: '',
    voice: 'Google.en-US-Journey-F',
    max_call_minutes: 6,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Number search
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchCountry, setSearchCountry] = useState('CA');
  const [searching, setSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Calls
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  // SMS
  const [smsTo, setSmsTo] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Active tab
  const [tab, setTab] = useState<'config' | 'calls' | 'sms'>('config');

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/phone');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
        setCalls(data.calls ?? []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function searchNumbers() {
    if (!searchAreaCode) return;
    setSearching(true);
    setAvailableNumbers([]);
    try {
      const res = await fetch(`/api/admin/phone/search?areaCode=${searchAreaCode}&country=${searchCountry}`);
      const data = await res.json();
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setSearching(false);
  }

  async function buyNumber(number: string) {
    setBuying(number);
    try {
      const res = await fetch('/api/admin/phone/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: number }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, phone_number: number, twilio_sid: data.twilio_sid, enabled: true }));
        setAvailableNumbers([]);
      }
    } catch (e) { console.error(e); }
    setBuying(null);
  }

  async function releaseNumber() {
    if (!confirm('Release this number permanently? This cannot be undone.')) return;
    setReleasing(true);
    try {
      const res = await fetch('/api/admin/phone/release', { method: 'POST' });
      if (res.ok) setConfig(prev => ({ ...prev, phone_number: '', twilio_sid: '', enabled: false }));
    } catch (e) { console.error(e); }
    setReleasing(false);
  }

  async function saveConfig() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/admin/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function sendSms() {
    if (!smsTo.trim() || !smsBody.trim()) return;
    setSendingSms(true);
    setSmsResult(null);
    try {
      const res = await fetch('/api/admin/phone/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: smsTo.trim(), body: smsBody.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsResult({ ok: true, message: `Sent to ${smsTo}` });
        setSmsBody('');
      } else {
        setSmsResult({ ok: false, message: data.error ?? 'Failed to send' });
      }
    } catch {
      setSmsResult({ ok: false, message: 'Connection error' });
    }
    setSendingSms(false);
  }

  const inputClass = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-colors';

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  const hasNumber = !!config.phone_number;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-indigo-500" /> Envosta Phone & SMS
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Internal Twilio phone number for Envosta — AI receptionist, call logs, and SMS.
          </p>
        </div>
        <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer"
          className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          <ExternalLink className="w-3 h-3" /> Twilio Console
        </a>
      </div>

      {/* Phone Number Status */}
      {!hasNumber ? (
        <div className="card border-dashed p-5 mb-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">Get a phone number for Envosta</p>
          <div className="flex gap-2">
            <select value={searchCountry} onChange={e => setSearchCountry(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
            <input type="text" placeholder="Area code (e.g. 403)" value={searchAreaCode}
              onChange={e => setSearchAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
              onKeyDown={e => e.key === 'Enter' && searchNumbers()} />
            <button onClick={searchNumbers} disabled={searching || !searchAreaCode}
              className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
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
                    {buying === n.phoneNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${config.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <div>
                <p className="text-sm font-mono font-semibold text-gray-900">{config.phone_number}</p>
                <p className="text-xs text-gray-500">{config.enabled ? 'Active — receiving calls' : 'Disabled'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-3 py-1 text-xs font-medium rounded-md ${config.enabled ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                {config.enabled ? 'Disable' : 'Enable'}
              </button>
              <button onClick={releaseNumber} disabled={releasing}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md">
                {releasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      {hasNumber && (
        <>
          <div className="flex items-center gap-1 mb-5">
            {([
              { id: 'config' as const, label: 'AI Receptionist', icon: Settings },
              { id: 'calls' as const, label: `Calls${calls.length > 0 ? ` (${calls.length})` : ''}`, icon: Mic },
              { id: 'sms' as const, label: 'Send SMS', icon: MessageSquare },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Config Tab ── */}
          {tab === 'config' && (
            <div className="card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Name</label>
                  <input type="text" value={config.business_name}
                    onChange={e => setConfig({ ...config, business_name: e.target.value })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Hours</label>
                  <input type="text" value={config.business_hours}
                    onChange={e => setConfig({ ...config, business_hours: e.target.value })}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Greeting Message</label>
                <input type="text" value={config.greeting_message}
                  onChange={e => setConfig({ ...config, greeting_message: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Services Offered</label>
                <textarea value={config.services_offered}
                  onChange={e => setConfig({ ...config, services_offered: e.target.value })}
                  className={inputClass + ' resize-none'} rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Booking Instructions</label>
                <textarea value={config.booking_instructions}
                  onChange={e => setConfig({ ...config, booking_instructions: e.target.value })}
                  className={inputClass + ' resize-none'} rows={2}
                  placeholder="How should the AI handle booking requests?" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Custom AI Prompt <span className="text-gray-400 font-normal">(extra instructions)</span></label>
                <textarea value={config.custom_prompt}
                  onChange={e => setConfig({ ...config, custom_prompt: e.target.value })}
                  className={inputClass + ' resize-none'} rows={3}
                  placeholder="You are the Envosta receptionist. Always mention we're a Canadian company..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Voice</label>
                  <select value={config.voice} onChange={e => setConfig({ ...config, voice: e.target.value })} className={inputClass}>
                    {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Max Call Duration (min)</label>
                  <input type="number" value={config.max_call_minutes} min={1} max={10}
                    onChange={e => setConfig({ ...config, max_call_minutes: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
                    className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveConfig} disabled={saving}
                  className="btn-admin text-xs py-2 px-4 inline-flex items-center gap-1.5">
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  {saved ? 'Saved!' : 'Save Configuration'}
                </button>
              </div>
            </div>
          )}

          {/* ── Calls Tab ── */}
          {tab === 'calls' && (
            <div className="card p-5">
              {calls.length === 0 ? (
                <div className="text-center py-8">
                  <Mic className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No calls yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {calls.map(call => (
                    <div key={call.id} className="border border-gray-100 rounded-lg overflow-hidden">
                      <button onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-mono text-gray-700">{call.caller}</span>
                          <span className="text-xs text-gray-400">{call.duration_minutes}min</span>
                          <span className="text-xs text-indigo-600 font-medium">{call.credits_charged} cr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">
                            {new Date(call.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {expandedCall === call.id ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                        </div>
                      </button>
                      {expandedCall === call.id && call.transcript?.length > 0 && (
                        <div className="px-3 pb-3 border-t border-gray-50 space-y-1.5 max-h-64 overflow-auto">
                          {call.transcript.map((t, i) => (
                            <div key={i} className={`flex ${t.speaker === 'ai' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
                                t.speaker === 'ai' ? 'bg-indigo-50 text-indigo-800' : 'bg-gray-100 text-gray-700'
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
              )}
            </div>
          )}

          {/* ── SMS Tab ── */}
          {tab === 'sms' && (
            <div className="card p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Send an SMS from the Envosta number ({config.phone_number}). Used for customer follow-ups, appointment confirmations, etc.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To (phone number)</label>
                <input type="tel" value={smsTo} onChange={e => setSmsTo(e.target.value)}
                  className={inputClass} placeholder="+1 (403) 555-0199" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
                <textarea value={smsBody} onChange={e => setSmsBody(e.target.value)}
                  className={inputClass + ' resize-none'} rows={4}
                  placeholder="Hi! This is Envosta following up on..." />
                <p className="text-[10px] text-gray-400 mt-1 text-right">{smsBody.length}/160 characters</p>
              </div>
              {smsResult && (
                <p className={`text-xs ${smsResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>{smsResult.message}</p>
              )}
              <div className="flex justify-end">
                <button onClick={sendSms} disabled={sendingSms || !smsTo.trim() || !smsBody.trim()}
                  className="btn-admin text-xs py-2 px-4 inline-flex items-center gap-1.5">
                  {sendingSms ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Send SMS
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
