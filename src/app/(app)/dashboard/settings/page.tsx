'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Camera } from 'lucide-react';
import Toast from '@/components/ui/toast';
import Modal from '@/components/ui/modal';
import Toggle from '@/components/ui/toggle';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    billing: true,
    site: true,
    domain: true,
    marketing: false,
  });

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name ?? '');
      }
      setLoading(false);
    })();
  }, []);

  // Get initials for avatar fallback
  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user!.id);
      if (error) throw error;
      showToast('Profile updated successfully', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully', 'success');
    } catch {
      showToast('Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleSavePreferences() {
    try {
      const supabase = createClient();
      await supabase.from('users').update({
        metadata: {
          ...(user as any)?.metadata,
          notification_prefs: { billing: true, sites: true, domains: true, marketing: false },
        },
      }).eq('id', user!.id);
      showToast('Preferences saved', 'success');
    } catch {
      showToast('Failed to save preferences', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your profile and account preferences</p>

      {/* Section 1: Profile */}
      <div className="card p-6 max-w-2xl mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-gray-600">
                {getInitials(fullName)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => console.log('Upload photo clicked')}
              className="btn-secondary text-sm"
            >
              <Camera className="h-4 w-4" />
              Upload Photo
            </button>
          </div>

          {/* Full Name */}
          <div>
            <label className="label">Full name</label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="label">Email</label>
            <p className="text-sm text-gray-700 py-2.5">{email}</p>
            <p className="text-xs text-gray-400 mt-0.5">To change your email, contact support.</p>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>

      {/* Section 2: Change Password */}
      <div className="card p-6 max-w-2xl mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Change Password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={updatingPassword}>
            {updatingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>

      {/* Section 3: Notification Preferences */}
      <div className="card p-6 max-w-2xl mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Notification Preferences</h2>
        <div className="space-y-5">
          <Toggle
            checked={notifications.billing}
            onChange={(val) => setNotifications((p) => ({ ...p, billing: val }))}
            label="Billing notifications"
            description="Payment confirmations, failed payments"
          />
          <Toggle
            checked={notifications.site}
            onChange={(val) => setNotifications((p) => ({ ...p, site: val }))}
            label="Site notifications"
            description="Site ready, maintenance updates"
          />
          <Toggle
            checked={notifications.domain}
            onChange={(val) => setNotifications((p) => ({ ...p, domain: val }))}
            label="Domain notifications"
            description="Expiry reminders, renewals"
          />
          <Toggle
            checked={notifications.marketing}
            onChange={(val) => setNotifications((p) => ({ ...p, marketing: val }))}
            label="Marketing emails"
            description="Product updates, tips"
          />
          <button type="button" className="btn-primary" onClick={handleSavePreferences}>
            Save Preferences
          </button>
        </div>
      </div>

      {/* Section 4: Danger Zone */}
      <div className="card p-6 max-w-2xl border-red-200">
        <h2 className="text-base font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          type="button"
          className="btn-danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <p className="text-sm text-gray-600 mb-6">
          This will permanently delete your account, sites, and all associated data. This action
          cannot be undone.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              setShowDeleteModal(false);
              showToast('To delete your account, please contact support at support@envosta.com', 'info');
            }}
          >
            Delete My Account
          </button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
