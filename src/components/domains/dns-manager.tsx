'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

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

function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60} min`;
  if (seconds < 86400) return `${seconds / 3600} hr`;
  return `${seconds / 86400} day`;
}

export function DnsManager({ domainId, domainName, initialRecords, siteId }: {
  domainId: string;
  domainName: string;
  initialRecords?: any[];
  siteId?: string | null;
}) {
  // Convert stored DNS records to display format
  const storedRecords: DnsRecord[] = (initialRecords ?? []).map((r: any, i: number) => ({
    id: String(i),
    type: r.type ?? 'A',
    name: r.subdomain === '' ? '@' : r.subdomain ?? '@',
    value: r.ip_address ?? r.hostname ?? r.text ?? '',
    ttl: r.ttl ?? 3600,
  }));

  const [records, setRecords] = useState<DnsRecord[]>(storedRecords);
  const [settingUp, setSettingUp] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');

  async function handleSetupDns() {
    setSettingUp(true);
    setSetupMsg('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSetupMsg('Not authenticated'); setSettingUp(false); return; }

      // Get site IP from the connected service
      let siteIp = '';
      if (siteId) {
        const { data: svc } = await supabase.from('sites').select('metadata').eq('id', siteId).maybeSingle();
        siteIp = (svc?.metadata as any)?.site_ip ?? '';
      }

      if (!siteIp) {
        setSetupMsg('No site IP found. Connect this domain to a provisioned site first.');
        setSettingUp(false);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ action: 'setup-dns', domainName, siteIp }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSetupMsg(`DNS configured: ${data.records} records set for ${siteIp}`);
        // Refresh page to show new records
        window.location.reload();
      } else {
        setSetupMsg(data.error ?? 'DNS setup failed');
      }
    } catch { setSetupMsg('Connection error'); }
    setSettingUp(false);
  }
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'A', name: '', value: '', priority: 10, ttl: 3600 });

  function resetForm() {
    setForm({ type: 'A', name: '', value: '', priority: 10, ttl: 3600 });
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(record: DnsRecord) {
    setForm({
      type: record.type,
      name: record.name,
      value: record.value,
      priority: record.priority ?? 10,
      ttl: record.ttl,
    });
    setEditingId(record.id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    setRecords(records.filter((r) => r.id !== id));
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
      const newRecord: DnsRecord = {
        id: Date.now().toString(),
        type: form.type,
        name: form.name,
        value: form.value,
        priority: form.type === 'MX' ? form.priority : undefined,
        ttl: form.ttl,
      };
      setRecords([...records, newRecord]);
    }
    resetForm();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-900">DNS Management</h2>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-secondary text-xs py-1.5 px-3">
            <Plus className="w-3.5 h-3.5" /> Add Record
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Manage DNS records for {domainName}.</p>

      {/* DNS Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Type</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Name</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Value</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">TTL</th>
              <th className="px-4 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-sm text-gray-400 py-8">No DNS records.</td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-700">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">{record.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono max-w-xs truncate">
                    {record.priority !== undefined && <span className="text-gray-400 mr-1">{record.priority}</span>}
                    {record.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatTtl(record.ttl)}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Record Form */}
      {showForm && (
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
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="@ or subdomain"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Value</label>
              <input
                type="text"
                className="input"
                placeholder="IP address or hostname"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
              />
            </div>
            {form.type === 'MX' && (
              <div>
                <label className="label">Priority</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  max={65535}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            )}
            <div>
              <label className="label">TTL</label>
              <select
                className="input"
                value={form.ttl}
                onChange={(e) => setForm({ ...form, ttl: parseInt(e.target.value) })}
              >
                {TTL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm">
              {editingId ? 'Save Changes' : 'Add Record'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <p className="text-xs text-gray-400 mt-3">Changes may take up to 48 hours to propagate.</p>
    </div>
  );
}
