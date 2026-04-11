'use client';

import { useState, useEffect } from 'react';
import { Brain, Zap, Hash, CreditCard, AlertTriangle } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  generate_page: 'Page Generation',
  studio_brief: 'Studio Brief',
  draft_reply: 'Draft Reply',
  onboarding_brief: 'Onboarding Brief',
  intake_summary: 'Intake Summary',
  unknown: 'Other',
};

interface AiUsageData {
  totalTokens: number;
  totalCredits: number;
  totalCalls: number;
  tokenLimit: number | null;
  tokenUsagePercent: number | null;
  byAction: Record<string, { calls: number; tokens: number; credits: number }>;
  daily: Record<string, { tokens: number; credits: number; calls: number }>;
}

export function AiUsageDashboard() {
  const [data, setData] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage/ai')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded" />;
  }

  if (!data) return null;

  const isNearLimit = data.tokenUsagePercent !== null && data.tokenUsagePercent >= 80;
  const isOverLimit = data.tokenUsagePercent !== null && data.tokenUsagePercent >= 100;

  // Build daily chart bars (last 14 days)
  const today = new Date();
  const days: { label: string; key: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    days.push({ label: d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), key });
  }
  const maxDaily = Math.max(1, ...days.map((d) => data.daily[d.key]?.tokens ?? 0));

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Hash className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Tokens Used</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{data.totalTokens.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Credits Charged</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{data.totalCredits}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">API Calls</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{data.totalCalls}</p>
        </div>
        {data.tokenLimit && (
          <div className={`rounded-lg px-4 py-3 ${isOverLimit ? 'bg-red-50' : isNearLimit ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {isNearLimit ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <Brain className="w-3.5 h-3.5 text-gray-400" />}
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Limit</span>
            </div>
            <p className={`text-lg font-bold ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-900'}`}>
              {data.tokenUsagePercent}%
            </p>
            <p className="text-[10px] text-gray-400">{data.totalTokens.toLocaleString()} / {data.tokenLimit.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Token Limit Bar */}
      {data.tokenLimit && (
        <div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>Monthly token limit</span>
            <span>{data.totalTokens.toLocaleString()} / {data.tokenLimit.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, data.tokenUsagePercent ?? 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Daily Usage Chart */}
      <div>
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Daily Token Usage (14 days)</p>
        <div className="flex items-end gap-1 h-20">
          {days.map((day) => {
            const val = data.daily[day.key]?.tokens ?? 0;
            const height = maxDaily > 0 ? (val / maxDaily) * 100 : 0;
            return (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-1" title={`${day.label}: ${val.toLocaleString()} tokens`}>
                <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                  <div
                    className={`w-full max-w-[20px] rounded-t transition-all ${val > 0 ? 'bg-purple-400 hover:bg-purple-500' : 'bg-gray-100'}`}
                    style={{ height: `${Math.max(height, val > 0 ? 4 : 0)}%`, minHeight: val > 0 ? '2px' : '0' }}
                  />
                </div>
                <span className="text-[8px] text-gray-400 truncate w-full text-center">{day.label.split(' ')[1]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Action Breakdown */}
      {Object.keys(data.byAction).length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">By Action</p>
          <div className="space-y-1.5">
            {Object.entries(data.byAction)
              .sort(([, a], [, b]) => b.tokens - a.tokens)
              .map(([action, stats]) => (
                <div key={action} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600 flex-1">{ACTION_LABELS[action] ?? action}</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{stats.calls} call{stats.calls !== 1 ? 's' : ''}</span>
                  <span className="text-xs text-gray-500 w-24 text-right font-mono">{stats.tokens.toLocaleString()} tk</span>
                  <span className="text-xs font-medium text-purple-600 w-16 text-right">{Math.round(stats.credits * 100) / 100} cr</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {data.totalCalls === 0 && (
        <div className="text-center py-6">
          <Brain className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No AI usage this month</p>
        </div>
      )}
    </div>
  );
}
