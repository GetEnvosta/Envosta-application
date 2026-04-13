'use client';

import { useState } from 'react';
import Modal from '@/components/ui/modal';
import { ALL_ROLES } from '@/lib/roles';
import { UserPlus } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer' as string,
    phone: '',
    companyName: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function reset() {
    setForm({ name: '', email: '', password: '', role: 'customer', phone: '', companyName: '' });
    setStatus('idle');
    setErrorMsg('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong');
        return;
      }

      setStatus('success');
      setTimeout(() => {
        handleClose();
        onCreated?.();
      }, 1500);
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create User">
      {status === 'success' ? (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">User created successfully!</p>
          <p className="text-xs text-gray-500 mt-1">Redirecting...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              type="text"
              required
              maxLength={200}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder="John Smith"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input
              type="email"
              required
              maxLength={320}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="john@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password *</label>
            <input
              type="text"
              required
              minLength={8}
              maxLength={128}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={inputClass}
              placeholder="Min 8 characters"
            />
            <p className="text-xs text-gray-400 mt-1">User should change this on first login.</p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
            <select
              required
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className={inputClass}
            >
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <input
              type="text"
              maxLength={200}
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              className={inputClass}
              placeholder="Acme Inc."
            />
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
