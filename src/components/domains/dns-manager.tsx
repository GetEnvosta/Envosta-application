'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Save, Wand2, Settings2, Server, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl: number;
}

const TTL_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '1 hour', value: 3600 },
  { label: '12 hours', value: 43200 },
  { label: '1 day', value: 86400 },
];

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT'];
const DEFAULT_NAMESERVERS = ['ns1.systemdns.com', 'ns2.systemdns.com', 'ns3.systemdns.com'];

function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60} min`;
  if (seconds < 86400) return `${seconds / 3600} hr`;
  return `${seconds / 86400} day`;
}

function isEnvostaNameservers(ns: string[]): boolean {
  return ns.length === 0 || ns.every((n) => n.includes('systemdns.com'));
}

export function DnsManager({ domainId, domainName, initialRecords, siteId, initialDnsMode, currentNameservers }: {
  domainId: string;
  domainName: string;
  initialRecords?: any[];
  siteId?: string | null;
  initialDnsMode?: string;
  currentNameservers?: string[];
}) {
  const router = useRouter();
  const ns = currentNameservers ?? [];
  const usingEnvosta = isEnvostaNameservers(ns);

  // Top-level: Envosta DNS vs External DNS
  const [dnsProvider, setDnsProvider] = useState<'envosta' | 'external'>(usingEnvosta ? 'envosta' : 'external');
  const [switchingProvider, setSwitchingProvider] = useState(false);

  // Record mode within Envosta DNS: auto vs custom
  const [dnsMode, setDnsMode] = useState<'auto' | 'custom'>(initialDnsMode === 'custom' ? 'custom' : 'auto');
  const [switchingMode, setSwitchingMode] = useState(false);

  // Custom nameserver inputs (for external DNS)
  const [customNs, setCustomNs] = useState<string[]>(usingEnvosta ? ['', ''] : ns);
  const [nsError, setNsError] = useState('');

  // DNS records state
  const storedRecords: DnsRecord[] = (initialRecords ?? []).map((r: any, i: number) => ({
    id: String(i),
    type: r.type ?? 'A',
    name: r.subdomain === '' ? '@' : r.subdomain ?? '@',
    value: r.ip_address ?? r.ipv6_address ?? r.hostname ?? r.text ?? '',
    priority: r.priority,
    ttl: r.ttl ?? 3600,
  }));

  const [records, setRecords] = useState<DnsRecord[]>(storedRecords);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'A', name: '', value: '', priority: 10, ttl: 3600 });

  const markChanged = useCallback(() => setHasChanges(true), []);

  async function getSiteIp(): Promise<string> {
    if (!siteId) return '';
    const supabase = createClient();
    const { data: svc } = await supabase.from('sites').select('metadata').eq('id', siteId).maybeSingle();
    return (svc?.metadata as any)?.site_ip ?? '';
  }

  // ─── Provider switching (Envosta ↔ External) ────────────

  async function switchToEnvosta() {
    setSwitchingProvider(true);
    setStatusMsg('');
    setNsError('');
    try {
      // Update nameservers to Envosta defaults
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-nameservers', domainName, nameservers: DEFAULT_NAMESERVERS }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error ?? 'Failed to update nameservers');
        setSwitchingProvider(false);
        return;
      }
      setDnsProvider('envosta');
      setStatusMsg('Switched to Envosta DNS. Nameservers updated.');
      router.refresh();
    } catch { setStatusMsg('Connection error'); }
    setSwitchingProvider(false);
  }

  async function switchToExternal() {
    // Validate custom nameservers
    const filtered = customNs.filter(n => n.trim() !== '');
    if (filtered.length < 2) {
      setNsError('Enter at least 2 nameservers');
      return;
    }
    for (const n of filtered) {
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(n.trim())) {
        setNsError(`Invalid nameserver: ${n}`);
        return;
      }
    }

    setSwitchingProvider(true);
    setStatusMsg('');
    setNsError('');
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-nameservers', domainName, nameservers: filtered }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNsError(data.error ?? 'Failed to update nameservers');
        setSwitchingProvider(false);
        return;
      }
      setDnsProvider('external');
      setStatusMsg('Nameservers updated. DNS is now managed at your external provider.');
      router.refresh();
    } catch { setNsError('Connection error'); }
    setSwitchingProvider(false);
  }

  // ─── DNS mode switching (auto ↔ custom) ─────────────────

  async function handleSwitchMode(newMode: 'auto' | 'custom') {
    setSwitchingMode(true);
    setStatusMsg('');
    try {
      const payload: any = { action: 'set-dns-mode', domainName, dnsMode: newMode };
      if (newMode === 'auto') {
        const ip = await getSiteIp();
        if (ip) payload.siteIp = ip;
      }
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setDnsMode(newMode);
        setStatusMsg(newMode === 'custom'
          ? 'Custom DNS enabled. You can now manage your own records.'
          : 'Switched to automatic DNS. Records have been reset.');
        if (newMode === 'auto') window.location.reload();
      } else {
        setStatusMsg(data.error ?? 'Failed to switch DNS mode');
      }
    } catch { setStatusMsg('Connection error'); }
    setSwitchingMode(false);
  }

  // ─── DNS record actions ─────────────────────────────────

  async function handleSetupDns() {
    setSettingUp(true);
    setStatusMsg('');
    try {
      const siteIp = await getSiteIp();
      if (!siteIp) {
        setStatusMsg('No site IP found. Connect this domain to a provisioned site first.');
        setSettingUp(false);
        return;
      }
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-dns', domainName, siteIp }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`DNS configured: ${data.records} records set for ${siteIp}`);
        window.location.reload();
      } else {
        setStatusMsg(data.error ?? 'DNS setup failed');
      }
    } catch { setStatusMsg('Connection error'); }
    setSettingUp(false);
  }

  async function handleSaveAll() {
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-dns',
          domainName,
          records: records.map((r) => ({
            type: r.type, name: r.name, value: r.value,
            priority: r.type === 'MX' ? r.priority : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`Saved ${data.records} records to DNS zone`);
        setHasChanges(false);
      } else {
        setStatusMsg(data.error ?? 'Failed to save DNS records');
      }
    } catch { setStatusMsg('Connection error'); }
    setSaving(false);
  }

  function resetForm() {
    setForm({ type: 'A', name: '', value: '', priority: 10, ttl: 3600 });
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(record: DnsRecord) {
    setForm({ type: record.type, name: record.name, value: record.value, priority: record.priority ?? 10, ttl: record.ttl });
    setEditingId(record.id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    setRecords(records.filter((r) => r.id !== id));
    markChanged();
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      setRecords(records.map((r) =>
        r.id === editingId
          ? { ...r, type: form.type, name: form.name, value: form.value, priority: form.type === 'MX' ? form.priority : undefined, ttl: form.ttl }
          : r
      ));
    } else {
      setRecords([...records, {
        id: Date.now().toString(), type: form.type, name: form.name, value: form.value,
        priority: form.type === 'MX' ? form.priority : undefined, ttl: form.ttl,
      }]);
    }
    markChanged();
    resetForm();
  }

  const isCustomRecords = dnsMode === 'custom';

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">DNS Management</h2>
      <p className="text-sm text-gray-500 mb-4">Choose how DNS is managed for {domainName}.</p>

      {/* ── Provider selector: Envosta DNS vs External DNS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => { if (dnsProvider !== 'envosta') switchToEnvosta(); }}
          disabled={switchingProvider}
          className={`relative text-left rounded-xl border-2 p-4 transition-all ${
            dnsProvider === 'envosta'
              ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600/20'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dnsProvider === 'envosta' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${dnsProvider === 'envosta' ? 'text-brand-900' : 'text-gray-900'}`}>Envosta DNS</p>
              <p className="text-xs text-gray-500 mt-0.5">Use our nameservers and manage DNS records here.</p>
            </div>
          </div>
          {dnsProvider === 'envosta' && (
            <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => { if (dnsProvider !== 'external') setDnsProvider('external'); }}
          disabled={switchingProvider}
          className={`relative text-left rounded-xl border-2 p-4 transition-all ${
            dnsProvider === 'external'
              ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600/20'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dnsProvider === 'external' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${dnsProvider === 'external' ? 'text-brand-900' : 'text-gray-900'}`}>External DNS</p>
              <p className="text-xs text-gray-500 mt-0.5">Use your own nameservers (Cloudflare, Route 53, etc.).</p>
            </div>
          </div>
          {dnsProvider === 'external' && (
            <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-600" />
          )}
        </button>
      </div>

      {statusMsg && (
        <div className={`text-sm mb-4 px-3 py-2 rounded-lg ${statusMsg.includes('fail') || statusMsg.includes('error') || statusMsg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {statusMsg}
        </div>
      )}

      {/* ── External DNS: nameserver inputs + message ── */}
      {dnsProvider === 'external' && (
        <div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
            <p className="text-sm font-medium text-gray-900 mb-1">Your Nameservers</p>
            <p className="text-xs text-gray-500 mb-3">Enter the nameservers from your DNS provider. Changes may take up to 48 hours to propagate.</p>

            <div className="space-y-2 mb-3">
              {customNs.map((n, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-6 shrink-0">NS{i + 1}</span>
                  <input
                    type="text"
                    value={n}
                    onChange={(e) => {
                      const updated = [...customNs];
                      updated[i] = e.target.value.toLowerCase().trim();
                      setCustomNs(updated);
                      setNsError('');
                    }}
                    placeholder="ns1.example.com"
                    className="input flex-1 font-mono text-sm"
                  />
                  {customNs.length > 2 && (
                    <button onClick={() => setCustomNs(customNs.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {nsError && <p className="text-xs text-red-600 mb-2">{nsError}</p>}

            <div className="flex items-center gap-2">
              {customNs.length < 6 && (
                <button onClick={() => setCustomNs([...customNs, ''])} className="btn-secondary text-xs py-1.5 px-3">
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
              <button onClick={switchToExternal} disabled={switchingProvider} className="btn-primary text-xs py-1.5 px-3">
                {switchingProvider ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : <><Save className="w-3 h-3" /> Save Nameservers</>}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900">DNS records are managed at your provider</p>
            <p className="text-sm text-blue-700 mt-1">
              Since you are using external nameservers, manage your DNS records (A, CNAME, MX, TXT, etc.) through your DNS provider&apos;s dashboard.
              To manage DNS records directly through Envosta, switch to <strong>Envosta DNS</strong> above.
            </p>
          </div>
        </div>
      )}

      {/* ── Envosta DNS: mode toggle + record editor ── */}
      {dnsProvider === 'envosta' && (
        <div>
          {/* Nameserver info */}
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
            <Server className="w-3.5 h-3.5" />
            <span>Nameservers: <span className="font-mono">ns1.systemdns.com</span>, <span className="font-mono">ns2.systemdns.com</span>, <span className="font-mono">ns3.systemdns.com</span></span>
          </div>

          {/* Record mode: Automatic vs Custom */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <Settings2 className="w-4 h-4 text-gray-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Record Management</p>
              <p className="text-xs text-gray-500 truncate">
                {isCustomRecords
                  ? 'You manage your own DNS records. Auto-updates are paused.'
                  : 'Envosta automatically manages DNS for your connected site.'}
              </p>
            </div>
            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
              <button
                onClick={() => isCustomRecords && handleSwitchMode('auto')}
                disabled={switchingMode || !isCustomRecords}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${!isCustomRecords ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {switchingMode && !isCustomRecords ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Wand2 className="w-3 h-3 inline mr-1" />}
                Automatic
              </button>
              <button
                onClick={() => !isCustomRecords && handleSwitchMode('custom')}
                disabled={switchingMode || isCustomRecords}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${isCustomRecords ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {switchingMode && isCustomRecords ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Settings2 className="w-3 h-3 inline mr-1" />}
                Custom
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mb-3">
            <div />
            <div className="flex items-center gap-2">
              {isCustomRecords && hasChanges && (
                <button onClick={handleSaveAll} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Publish Changes'}
                </button>
              )}
              {isCustomRecords && !showForm && (
                <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-secondary text-xs py-1.5 px-3">
                  <Plus className="w-3.5 h-3.5" /> Add Record
                </button>
              )}
              {!isCustomRecords && records.length === 0 && siteId && (
                <button onClick={handleSetupDns} disabled={settingUp} className="btn-primary text-xs py-1.5 px-3">
                  {settingUp ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Configuring...</> : <><Wand2 className="w-3.5 h-3.5" /> Auto-configure DNS</>}
                </button>
              )}
            </div>
          </div>

          {/* DNS Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Value</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">TTL</th>
                  {isCustomRecords && <th className="px-4 py-2.5 w-20"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={isCustomRecords ? 5 : 4} className="text-center text-sm text-gray-400 py-8">
                      {isCustomRecords ? 'No records yet. Click "Add Record" to get started.' : 'No DNS records configured.'}
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-700">{record.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono max-w-xs truncate">
                        {record.priority !== undefined && <span className="text-gray-400 mr-1">{record.priority}</span>}
                        {record.value}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatTtl(record.ttl)}</td>
                      {isCustomRecords && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(record)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit form (custom mode only) */}
          {isCustomRecords && showForm && (
            <form onSubmit={handleSave} className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">{editingId ? 'Edit Record' : 'Add Record'}</h3>
                <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Name</label>
                  <input type="text" className="input" placeholder="@ or subdomain" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Value</label>
                  <input type="text" className="input" placeholder="IP address or hostname" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
                </div>
                {form.type === 'MX' && (
                  <div>
                    <label className="label">Priority</label>
                    <input type="number" className="input" min={0} max={65535} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} required />
                  </div>
                )}
                <div>
                  <label className="label">TTL</label>
                  <select className="input" value={form.ttl} onChange={(e) => setForm({ ...form, ttl: parseInt(e.target.value) })}>
                    {TTL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button type="submit" className="btn-primary text-sm">{editingId ? 'Save Changes' : 'Add Record'}</button>
                <button type="button" onClick={resetForm} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          {isCustomRecords && hasChanges && (
            <p className="text-xs text-amber-600 mt-3">You have unsaved changes. Click &quot;Publish Changes&quot; to update the DNS zone at OpenSRS.</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Changes may take up to 48 hours to propagate.</p>
        </div>
      )}
    </div>
  );
}
