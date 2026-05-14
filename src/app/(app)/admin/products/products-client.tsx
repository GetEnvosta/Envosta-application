'use client';

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProductsClient() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSyncAll() {
    setSyncing(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sync_all' }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Synced: ${data.results?.length ?? 0} products`);
        setTimeout(() => { setResult(''); window.location.reload(); }, 2000);
      } else {
        setResult(data.error ?? 'Sync failed');
      }
    } catch { setResult('Sync failed'); }
    setSyncing(false);
  }

  async function quickCreate(type: string, name: string, slug: string, billing: string, price: number) {
    setCreating(true);
    setShowMenu(false);
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, slug, billing, price_cad: price }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/admin/products/plans/${data.id}`);
      } else {
        setResult(data.error ?? 'Failed to create');
        setCreating(false);
      }
    } catch {
      setResult('Failed to create');
      setCreating(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      {result && <span className="text-xs text-gray-500">{result}</span>}
      <button
        onClick={handleSyncAll}
        disabled={syncing}
        className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync All'}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={creating}
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Add Product'}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => quickCreate('hosting_plan', 'New Plan', `plan-${Date.now()}`, 'monthly', 0)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <p className="text-sm font-medium text-gray-900">Hosting Plan</p>
              <p className="text-xs text-gray-500">Monthly/yearly subscription</p>
            </button>
            <button
              onClick={() => quickCreate('plan_addon', 'New Add-on', `addon-${Date.now()}`, 'monthly', 0)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <p className="text-sm font-medium text-gray-900">Plan Add-on</p>
              <p className="text-xs text-gray-500">Per-site recurring add-on</p>
            </button>
            <button
              onClick={() => quickCreate('one_time_service', 'New Service', `service-${Date.now()}`, 'one_time', 0)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900">One-Time Service</p>
              <p className="text-xs text-gray-500">Single charge (studio, migration)</p>
            </button>
            {/* Phase 3: Domain TLDs are managed in public.tlds, not public.products. */}
          </div>
        )}
      </div>
    </div>
  );
}

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${productName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch { /* ignore */ }
    setDeleting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-400 hover:text-red-600 inline-flex items-center gap-1"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  );
}
