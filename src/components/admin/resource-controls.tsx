'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Save, Loader2, Zap, HardDrive, Cpu, MemoryStick } from 'lucide-react';

interface Props {
  siteId: string;
  wpCloudSiteId: string | null;
  config: any;
  planMetadata: any;
}

const WORKER_OPTIONS = [2, 4, 6, 8, 12, 30];
const MEMORY_OPTIONS = [512, 1024, 1536, 2048];
const STORAGE_OPTIONS = [10, 25, 50, 75, 100, 200, 400, 600, 800, 1000];

export function ResourceControls({ siteId, wpCloudSiteId, config, planMetadata }: Props) {
  const [phpWorkers, setPhpWorkers] = useState(config?.php_workers ?? planMetadata?.php_workers_default ?? 2);
  const [phpMemory, setPhpMemory] = useState(config?.php_memory_mb ?? planMetadata?.php_memory_mb ?? 512);
  const [storageGb, setStorageGb] = useState(config?.storage_gb ?? planMetadata?.storage_gb ?? 25);
  const [bursting, setBursting] = useState(config?.burst_php_conns === 1);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    setErrorMsg('');

    const newConfig = {
      ...config,
      php_workers: phpWorkers,
      php_memory_mb: phpMemory,
      storage_gb: storageGb,
      burst_php_conns: bursting ? 1 : 0,
    };

    // 1. Update sites.config in DB
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from('sites')
      .update({ config: newConfig })
      .eq('id', siteId);

    if (dbErr) {
      setErrorMsg(dbErr.message);
      setStatus('error');
      setSaving(false);
      return;
    }

    // 2. Call wp.cloud to update the site (via site-info Edge Function)
    if (wpCloudSiteId) {
      try {
        const res = await fetch('/api/site-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-meta',
            siteId,
            meta: {
              default_php_conns: phpWorkers,
              php_memory_limit: `${phpMemory}M`,
              burst_php_conns: bursting ? 1 : 0,
            },
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setErrorMsg(`DB updated but wp.cloud failed: ${data.error ?? 'unknown'}`);
          setStatus('error');
          setSaving(false);
          return;
        }
      } catch (e) {
        setErrorMsg('DB updated but wp.cloud update failed');
        setStatus('error');
        setSaving(false);
        return;
      }
    }

    setStatus('success');
    setSaving(false);
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">wp.cloud Configuration</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> PHP Workers
          </label>
          <select className="input" value={phpWorkers} onChange={e => setPhpWorkers(Number(e.target.value))}>
            {WORKER_OPTIONS.map(w => (
              <option key={w} value={w}>{w} workers</option>
            ))}
          </select>
          {planMetadata?.php_workers_included && (
            <p className="text-xs text-gray-400 mt-1">Plan includes up to {planMetadata.php_workers_included}</p>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <MemoryStick className="w-3.5 h-3.5" /> PHP Memory
          </label>
          <select className="input" value={phpMemory} onChange={e => setPhpMemory(Number(e.target.value))}>
            {MEMORY_OPTIONS.map(m => (
              <option key={m} value={m}>{m} MB</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" /> Storage
          </label>
          <select className="input" value={storageGb} onChange={e => setStorageGb(Number(e.target.value))}>
            {STORAGE_OPTIONS.map(s => (
              <option key={s} value={s}>{s} GB</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Bursting
          </label>
          <button
            onClick={() => setBursting(!bursting)}
            className={`w-full input text-left ${bursting ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
          >
            {bursting ? '✓ Enabled' : 'Disabled'}
          </button>
          <p className="text-xs text-gray-400 mt-1">Auto-scales to 110+ workers</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-admin text-sm inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save & Update wp.cloud
        </button>
        {status === 'success' && <span className="text-sm text-green-600">Updated ✓</span>}
        {status === 'error' && <span className="text-sm text-red-600">{errorMsg || 'Failed'}</span>}
      </div>
    </div>
  );
}
