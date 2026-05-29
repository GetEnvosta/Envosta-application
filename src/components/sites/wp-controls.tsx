'use client';

import { useState } from 'react';
import { Loader2, Search, Wrench, Puzzle, Paintbrush } from 'lucide-react';

export interface WpControlsState {
  searchVisible: boolean;
  maintenance: boolean;
  autoUpdatePlugins: boolean;
  autoUpdateThemes: boolean;
}

type FeatureKey =
  | 'search-visibility'
  | 'maintenance-mode'
  | 'auto-update-plugins'
  | 'auto-update-themes';

function Toggle({ enabled, loading, color, onToggle }: {
  enabled: boolean;
  loading: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0"
      style={{ background: enabled ? color : '#d1d5db', opacity: loading ? 0.5 : 1 }}
    >
      {loading ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
      ) : (
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
          style={{ transform: enabled ? 'translateX(17px)' : 'translateX(3px)' }}
        />
      )}
    </button>
  );
}

export function WpControls({ siteId, initial }: { siteId: string; initial: WpControlsState }) {
  const [state, setState] = useState<WpControlsState>(initial);
  const [loadingKey, setLoadingKey] = useState<FeatureKey | ''>('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function toggle(feature: FeatureKey, stateKey: keyof WpControlsState, successLabel: string) {
    if (loadingKey) return;
    const next = !state[stateKey];
    setLoadingKey(feature);
    setMsg('');
    setError('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wp-feature', siteId, feature, enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update setting');
        return;
      }
      setState((s) => ({ ...s, [stateKey]: next }));
      setMsg(`${successLabel} ${next ? 'enabled' : 'disabled'}`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setError('Connection error');
    } finally {
      setLoadingKey('');
    }
  }

  return (
    <div className="space-y-3">
      {/* Search engine visibility */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Search Engine Visibility</p>
            <p className="text-xs text-gray-500">Allow Google and other engines to index this site</p>
          </div>
        </div>
        <Toggle
          enabled={state.searchVisible}
          loading={loadingKey === 'search-visibility'}
          color="#22c55e"
          onToggle={() => toggle('search-visibility', 'searchVisible', 'Search visibility')}
        />
      </div>

      {/* Maintenance mode */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Wrench className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
            <p className="text-xs text-gray-500">Show a maintenance page to visitors while you work</p>
          </div>
        </div>
        <Toggle
          enabled={state.maintenance}
          loading={loadingKey === 'maintenance-mode'}
          color="#f59e0b"
          onToggle={() => toggle('maintenance-mode', 'maintenance', 'Maintenance mode')}
        />
      </div>

      {/* Auto-update plugins */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Puzzle className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Auto-Update Plugins</p>
            <p className="text-xs text-gray-500">Keep all plugins updated automatically</p>
          </div>
        </div>
        <Toggle
          enabled={state.autoUpdatePlugins}
          loading={loadingKey === 'auto-update-plugins'}
          color="#2563eb"
          onToggle={() => toggle('auto-update-plugins', 'autoUpdatePlugins', 'Plugin auto-updates')}
        />
      </div>

      {/* Auto-update themes */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Paintbrush className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Auto-Update Themes</p>
            <p className="text-xs text-gray-500">Keep all themes updated automatically</p>
          </div>
        </div>
        <Toggle
          enabled={state.autoUpdateThemes}
          loading={loadingKey === 'auto-update-themes'}
          color="#2563eb"
          onToggle={() => toggle('auto-update-themes', 'autoUpdateThemes', 'Theme auto-updates')}
        />
      </div>

      {msg && <p className="text-xs text-green-600 mt-1">{msg}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <p className="text-[11px] text-gray-400 pt-1">
        Changes run on your site in the background and may take a moment to take effect.
      </p>
    </div>
  );
}
