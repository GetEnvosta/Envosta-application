'use client';

import { useState, useEffect } from 'react';
import { Brain, Phone, Gauge } from 'lucide-react';

interface SiteUsageData {
  hosting: number;
  ai_tokens: number;
  ai_calls: number;
  ai_total_tokens: number;
  receptionist_credits: number;
  receptionist_calls: number;
  receptionist_minutes: number;
  phone_number: number;
  total: number;
}

export function SiteUsage({ siteId }: { siteId: string }) {
  const [data, setData] = useState<SiteUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/usage/site?siteId=${siteId}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded" />;
  if (!data) return null;

  const hasAi = data.ai_calls > 0;
  const hasCalls = data.receptionist_calls > 0;

  if (!hasAi && !hasCalls && data.total <= 0) {
    return (
      <div className="text-center py-4">
        <Gauge className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-xs text-gray-400">No variable usage this cycle</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI Usage */}
      {hasAi && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <div>
              <p className="text-xs font-medium text-gray-700">AI Tokens</p>
              <p className="text-[10px] text-gray-400">{data.ai_calls} call{data.ai_calls !== 1 ? 's' : ''} · {data.ai_total_tokens.toLocaleString()} tokens</p>
            </div>
          </div>
          <span className="text-xs font-medium text-purple-600">{data.ai_tokens.toFixed(2)} cr</span>
        </div>
      )}

      {/* Receptionist Usage */}
      {hasCalls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-blue-500" />
            <div>
              <p className="text-xs font-medium text-gray-700">Receptionist Calls</p>
              <p className="text-[10px] text-gray-400">{data.receptionist_calls} call{data.receptionist_calls !== 1 ? 's' : ''} · {data.receptionist_minutes} min</p>
            </div>
          </div>
          <span className="text-xs font-medium text-blue-600">{data.receptionist_credits.toFixed(2)} cr</span>
        </div>
      )}

      {/* Total variable */}
      {(hasAi || hasCalls) && (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Variable usage this cycle</span>
          <span className="text-xs font-semibold text-gray-900">{(data.ai_tokens + data.receptionist_credits).toFixed(2)} cr</span>
        </div>
      )}
    </div>
  );
}
