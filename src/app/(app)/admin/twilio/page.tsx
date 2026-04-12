export const revalidate = 10;

import { getTwilioStats, getAllPhoneNumbers, getAllCallLogs, getTwilioUsageByUser } from '@/services/twilio-admin';
import { Phone, PhoneCall, Clock, Coins, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { TwilioTabs, CallTranscript, ReleaseNumberButton } from './twilio-tabs';
import { AdminBuyNumber } from '@/components/admin/admin-buy-number';

export default async function AdminTwilioPage() {
  const [stats, numbers, calls, usage] = await Promise.all([
    getTwilioStats(),
    getAllPhoneNumbers(),
    getAllCallLogs(undefined, 100),
    getTwilioUsageByUser(),
  ]);

  const statCards = [
    { label: 'Active Numbers', value: stats.activeNumbers, icon: Phone, color: 'blue' },
    { label: 'Calls This Month', value: stats.totalCalls, icon: PhoneCall, color: 'purple' },
    { label: 'Total Minutes', value: stats.totalMinutes, icon: Clock, color: 'amber' },
    { label: 'Credits Charged', value: `${stats.totalCredits} cr`, icon: Coins, color: 'green' },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Twilio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Phone numbers, call logs, and AI receptionist usage</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminBuyNumber />
          <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer"
            className="btn-admin inline-flex items-center gap-1.5">
            Twilio Console <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="card px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{card.value}</p>
                  <p className="text-[11px] text-gray-500">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <TwilioTabs>
        {{
          numbers: <NumbersTab numbers={numbers} />,
          calls: <CallsTab calls={calls} />,
          usage: <UsageTab usage={usage} />,
        }}
      </TwilioTabs>
    </div>
  );
}

/* ── Numbers Tab ── */
function NumbersTab({ numbers }: { numbers: any[] }) {
  if (numbers.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No phone numbers provisioned yet</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Owner</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Linked Site</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Cost</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {numbers.map(n => (
              <tr key={n.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-sm font-medium text-gray-900">{n.phone_number}</td>
                <td className="px-5 py-3">
                  <div>
                    <Link href={`/admin/customers/${n.user_id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                      {n.user_name || 'Unnamed'}
                    </Link>
                    <p className="text-xs text-gray-400">{n.user_email}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {n.site_id ? (
                    <Link href={`/admin/services/${n.site_id}`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                      {n.site_label}
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">Not linked</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                    n.enabled
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${n.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {n.enabled ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-xs text-gray-500">2 cr/mo</td>
                <td className="px-5 py-3 text-right">
                  <ReleaseNumberButton phoneNumberId={n.id} phoneNumber={n.phone_number} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Calls Tab ── */
function CallsTab({ calls }: { calls: any[] }) {
  if (calls.length === 0) {
    return (
      <div className="card p-8 text-center">
        <PhoneCall className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No calls recorded yet</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Caller</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Site</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Tokens</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Credits</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Transcript</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {calls.map(call => (
              <tr key={call.id} className="hover:bg-gray-50 align-top">
                <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(call.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}{' '}
                  {new Date(call.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-700">{call.caller_number}</td>
                <td className="px-5 py-3 text-xs text-gray-700">{call.site_label}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-600">{call.duration_minutes}min</td>
                <td className="px-5 py-3 text-right text-xs text-gray-400">{call.total_tokens.toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">{call.credits_charged} cr</td>
                <td className="px-5 py-3">
                  <CallTranscript transcript={call.transcript} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Usage Tab ── */
function UsageTab({ usage }: { usage: any[] }) {
  if (usage.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Coins className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No Twilio usage this month</p>
      </div>
    );
  }

  const totalCredits = usage.reduce((sum, u) => sum + u.total_credits, 0);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Numbers</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Calls</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Minutes</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Call Cr</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">AI Cr</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usage.map(u => (
              <tr key={u.user_id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link href={`/admin/customers/${u.user_id}`} className="text-brand-600 hover:text-brand-700 font-medium text-sm">
                    {u.user_name || 'Unknown'}
                  </Link>
                  <p className="text-xs text-gray-400">{u.user_email}</p>
                </td>
                <td className="px-5 py-3 text-right text-xs text-gray-600">{u.numbers}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-600">{u.calls}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-600">{u.minutes}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-600">{u.call_credits}</td>
                <td className="px-5 py-3 text-right text-xs text-purple-600">{u.ai_credits}</td>
                <td className="px-5 py-3 text-right text-xs font-semibold text-gray-900">{u.total_credits} cr</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-5 py-3 text-xs font-semibold text-gray-700" colSpan={6}>Total</td>
              <td className="px-5 py-3 text-right text-xs font-bold text-gray-900">{totalCredits} cr</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
