'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Save, Loader2, Zap, HardDrive, Cpu, MemoryStick, Code2 } from 'lucide-react';

interface Props {
  siteId: string;
  wpCloudSiteId: string | null;
  config: any;
  planMetadata: any;
  phpVersion?: string | null;
}

// wp.cloud caps default_php_conns at 10 (higher only by special request).
const WORKER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MEMORY_OPTIONS = [512, 1024, 1536, 2048];
const STORAGE_OPTIONS = [10, 25, 50, 75, 100, 200, 400, 600, 800, 1000];
const PHP_VERSION_OPTIONS = ['8.3', '8.4'];

export function ResourceControls({ siteId, wpCloudSiteId, config, planMetadata, phpVersion }: Props) {
  const [phpWorkers, setPhpWorkers] = useState(config?.php_workers ?? planMetadata?.php_workers_default ?? 2);
  const [phpMemory, setPhpMemory] = useState(config?.php_memory_mb ?? planMetadata?.php_memory_mb ?? 512);
  const [storageGb, setStorageGb] = useState(config?.storage_gb ?? planMetadata?.storage_gb ?? 25);
  const [bursting, setBursting] = useState(config?.burst_php_conns === 1);
  const [phpVer, setPhpVer] = useState(() => {
    const v = phpVersion ?? '8.4';
    return PHP_VERSION_OPTIONS.includes(v) ? v : '8.4';
  });
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

    // 1. Update sites.config + php_version in DB
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from('sites')
      .update({ config: newConfig, php_version: phpVer })
      .eq('id', siteId);

    if (dbErr) {
      setErrorMsg(dbErr.message);
      setStatus('error');
      setSaving(false);
      return;
    }

    // 2. Call wp.cloud to update each setting individually
    if (wpCloudSiteId) {
      const updates = [
        { key: 'default_php_conns', value: phpWorkers },
        { key: 'php_memory_limit', value: phpMemory },
        { key: 'burst_php_conns', value: bursting ? 1 : 0 },
        { key: 'php_version', value: phpVer },
      ];

      for (const { key, value } of updates) {
        try {
          const res = await fetch('/api/site-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update-meta', siteId, key, value }),
          });
          if (!res.ok) {
            const data = await res.json();
            setErrorMsg(`Failed to update ${key}: ${data.error ?? 'unknown'}`);
            setStatus('error');
            setSaving(false);
            return;
          }
        } catch {
          setErrorMsg(`Failed to update ${key}`);
          setStatus('error');
          setSaving(false);
          return;
        }
      }
    }

    setStatus('success');
    setSaving(false);
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" /> PHP Version
          </label>
          <select className="input" value={phpVer} onChange={e => setPhpVer(e.target.value)}>
            {PHP_VERSION_OPTIONS.map(v => (
              <option key={v} value={v}>PHP {v}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">8.1 EOL — use 8.3+</p>
        </div>

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
            className={`w-full input text-left ${bursting ? 'bg-amber-50 border-amber-300 text-amber-700' : ''}`}
          >
            {bursting ? '✓ Enabled (+$250/mo)' : 'Disabled'}
          </button>
          <p className="text-xs text-amber-600 mt-1">Paid wp.cloud option — <strong>+$250/mo per site</strong>; auto-scales to 110+ workers.</p>
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
