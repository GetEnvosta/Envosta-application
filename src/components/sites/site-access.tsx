'use client';

import { useState, useEffect } from 'react';
import { Loader2, Key, Copy, Check, Eye, EyeOff } from 'lucide-react';

export function SiteAccess({ siteId, wpCloudSiteId }: { siteId: string; wpCloudSiteId?: string | null }) {
  const [sftpUsers, setSftpUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!wpCloudSiteId) { setLoading(false); return; }
    fetch('/api/site-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sftp-credentials', siteId }),
    }).then(r => r.json()).then(data => {
      const users = Array.isArray(data) ? data : data?.users ?? data?.data ?? [];
      setSftpUsers(users);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [siteId, wpCloudSiteId]);

  function copyValue(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  }

  async function resetPassword() {
    if (!sftpUsers[0]) return;
    setResetting(true);
    setMsg('');
    const generated = `env_${Math.random().toString(36).slice(2, 14)}`;
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-sftp-password', siteId, key: sftpUsers[0].username ?? sftpUsers[0].name, value: generated }),
      });
      if (res.ok) {
        setNewPassword(generated);
        setShowPassword(true);
        setMsg('Password reset. Copy and save it now — it won\'t be shown again.');
      } else {
        const data = await res.json();
        setMsg(data.error ?? 'Failed to reset password');
      }
    } catch { setMsg('Connection error'); }
    setResetting(false);
  }

  const sftpHost = 'sftp.wp.cloud';
  const sftpPort = '22';
  const sftpUser = sftpUsers[0]?.username ?? sftpUsers[0]?.name ?? 'loading...';

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading access details...
        </div>
      ) : !wpCloudSiteId ? (
        <p className="text-sm text-gray-400">Site not yet provisioned on wp.cloud.</p>
      ) : (
        <div className="space-y-3">
          {/* SFTP Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AccessField label="Host" value={sftpHost} onCopy={() => copyValue(sftpHost, 'host')} copied={copied === 'host'} />
            <AccessField label="Port" value={sftpPort} onCopy={() => copyValue(sftpPort, 'port')} copied={copied === 'port'} />
            <AccessField label="Username" value={sftpUser} onCopy={() => copyValue(sftpUser, 'user')} copied={copied === 'user'} />
          </div>

          {/* Password / Reset */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">SFTP Password</p>
                {newPassword ? (
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-mono font-medium text-gray-900 ${showPassword ? '' : 'blur-sm select-none'}`}>{newPassword}</p>
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => copyValue(newPassword, 'pass')} className="text-gray-400 hover:text-gray-600">
                      {copied === 'pass' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Reset to reveal a new password</p>
                )}
              </div>
            </div>
            <button onClick={resetPassword} disabled={resetting || sftpUsers.length === 0} className="btn-secondary text-xs py-1.5 px-3">
              {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reset Password'}
            </button>
          </div>

          {msg && (
            <p className={`text-xs ${msg.includes('fail') || msg.includes('error') ? 'text-red-600' : 'text-amber-600'}`}>{msg}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AccessField({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3.5 py-2.5">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-mono font-medium text-gray-900 truncate">{value}</p>
        <button onClick={onCopy} className="text-gray-400 hover:text-gray-600 shrink-0">
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
