'use client';

import { useState } from 'react';
import { Loader2, Phone, RefreshCw, AlertTriangle, CheckCircle, Download } from 'lucide-react';

interface SyncResult {
  twilio: {
    total: number;
    inTwilioNotDb: { phoneNumber: string; friendlyName: string; sid: string; dateCreated: string }[];
    inDbNotTwilio: { phoneNumber: string; id: string; userId: string }[];
    matched: number;
  };
  db: { total: number; legacy: number };
}

export function TwilioSyncCheck() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  async function runCheck() {
    setLoading(true);
    setError('');
    setResult(null);
    setSyncMsg('');
    try {
      const res = await fetch('/api/admin/twilio-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.error ?? 'Check failed');
    } catch { setError('Connection error'); }
    setLoading(false);
  }

  async function runSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/admin/twilio-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`Imported ${data.imported} number${data.imported !== 1 ? 's' : ''} from Twilio`);
        // Re-run check to update results
        setTimeout(() => { runCheck(); }, 500);
      } else {
        setSyncMsg(data.error ?? 'Sync failed');
      }
    } catch { setSyncMsg('Sync failed'); }
    setSyncing(false);
  }

  const hasIssues = result && (result.twilio.inTwilioNotDb.length > 0 || result.twilio.inDbNotTwilio.length > 0);

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" /> Twilio Sync
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Compare Twilio account numbers against your database.</p>
        </div>
        <button onClick={runCheck} disabled={loading} className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      {syncMsg && <p className="text-xs text-emerald-600 mb-3 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {syncMsg}</p>}

      {result && (
        <div className="space-y-3">
          {/* Status card */}
          <div className={`rounded-lg border px-4 py-3 ${hasIssues ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-900">Twilio Phone Numbers</p>
              <span className="text-xs text-gray-500">{result.twilio.matched} matched · {result.twilio.total} in Twilio · {result.db.total} in DB</span>
            </div>

            {/* Numbers in Twilio but NOT in DB */}
            {result.twilio.inTwilioNotDb.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    In Twilio but NOT in your database ({result.twilio.inTwilioNotDb.length}):
                  </p>
                  <button onClick={runSync} disabled={syncing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
                    {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Import All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.twilio.inTwilioNotDb.map(n => (
                    <span key={n.sid} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-1">
                      {n.phoneNumber}
                      <span className="text-gray-400 ml-1 font-sans">{n.friendlyName !== n.phoneNumber ? n.friendlyName : ''}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Numbers in DB but NOT in Twilio */}
            {result.twilio.inDbNotTwilio.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  In database but NOT in Twilio ({result.twilio.inDbNotTwilio.length}):
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.twilio.inDbNotTwilio.map(n => (
                    <span key={n.id} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-1">
                      {n.phoneNumber}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">These may have been released from Twilio directly. Consider removing from your database.</p>
              </div>
            )}

            {/* All good */}
            {!hasIssues && (
              <p className="text-xs text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3" /> All synced — Twilio and database match
              </p>
            )}
          </div>

          {result.db.legacy > 0 && (
            <p className="text-[10px] text-gray-400">
              {result.db.legacy} number{result.db.legacy !== 1 ? 's' : ''} still on legacy sites.twilio_phone_number column
            </p>
          )}
        </div>
      )}
    </div>
  );
}
