'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, X, Loader2, ArrowRight, Building2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Toast from '@/components/ui/toast';

interface Client {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  sites_count: number;
  usage: number;
  included: number;
  company_name?: string | null;
}

interface ToastState { message: string; type: 'success' | 'error' | 'info' }

export default function PartnerClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [creating, setCreating] = useState(false);

  // Managing state
  const [managingId, setManagingId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
  }, []);

  async function loadClients() {
    const res = await fetch('/api/partner/clients');
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadClients(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/partner/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, companyName: company }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create client', 'error');
        return;
      }
      showToast(`${name} has been added as a client`, 'success');
      setName(''); setEmail(''); setCompany('');
      setShowForm(false);
      loadClients();
    } catch {
      showToast('Failed to create client', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleManage(clientId: string) {
    setManagingId(clientId);
    try {
      const res = await fetch('/api/partner/manage-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to switch', 'error');
        setManagingId(null);
      }
    } catch {
      showToast('Failed to switch to client', 'error');
      setManagingId(null);
    }
  }

  // Stat calculations
  const totalSites = clients.reduce((sum, c) => sum + c.sites_count, 0);
  const overUsage = clients.filter(c => c.usage > c.included).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} under your management
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Client'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Clients</p>
          <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Sites</p>
          <p className="text-2xl font-bold text-gray-900">{totalSites}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-gray-900">
            {clients.filter(c => c.sites_count > 0).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Over Usage</p>
          <p className={`text-2xl font-bold ${overUsage > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {overUsage}
          </p>
        </div>
      </div>

      {/* Inline Add Client form */}
      {showForm && (
        <div className="card p-5 border-sky-200 bg-sky-50/40">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-500" /> New Client Account
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <label className="label">Email Address <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@clientbusiness.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Company Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Services Inc."
              />
            </div>
            <p className="text-xs text-gray-400">
              A client account will be created and linked to your partner profile. The client can log in and you can manage their dashboard on their behalf.
            </p>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Client'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : clients.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Sites</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Usage</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/partner/clients/${c.id}`} className="hover:text-sky-600">
                      <p className="text-sm font-medium text-gray-900">{c.full_name ?? 'Unnamed'}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                      {c.company_name && (
                        <p className="text-xs text-gray-400">{c.company_name}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{c.sites_count}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-medium ${c.usage > c.included ? 'text-red-600' : 'text-gray-700'}`}>
                      {Math.round(c.usage)}/{c.included}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleManage(c.id)}
                      disabled={managingId === c.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {managingId === c.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ArrowRight className="w-3.5 h-3.5" />}
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No clients yet</p>
          <p className="text-xs text-gray-400 mb-4">
            Add your first client to get started managing their Envosta account.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
