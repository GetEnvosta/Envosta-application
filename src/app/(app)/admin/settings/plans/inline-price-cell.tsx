'use client';

/**
 * <InlinePriceCell> — click-to-edit price cell for the plans/TLD tables.
 *
 * Behaviour:
 *   - displays formatted currency until clicked
 *   - on click, swaps to a number input (cents) with the cursor focused
 *   - Enter or blur saves; Esc cancels
 *   - saving runs inside useTransition + a local saving flag so the rest
 *     of the row stays interactive and React can still stream other tabs
 *   - shows a tiny check / x for ~1.5s after save
 *
 * The cell never reloads the page on save. The parent decides whether to
 * refresh by passing onSaved(newCents) and calling router.refresh() itself.
 */
import { useState, useRef, useEffect, useTransition } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { formatCents } from '@/lib/utils';

interface Props {
  /** Current value in cents. */
  value: number | null;
  /** Currency for display. */
  currency?: 'cad' | 'usd';
  /** Called to perform the save. Should throw or return an error string on failure. */
  onSave: (newCents: number) => Promise<{ error?: string | null } | void>;
  /** Optional callback once the save resolves OK, with the saved value. */
  onSaved?: (newCents: number) => void;
  /** Render dash instead of $0.00 when value is 0/null. Default: false. */
  dashOnZero?: boolean;
}

export function InlinePriceCell({ value, currency = 'cad', onSave, onSaved, dashOnZero = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const [savedValue, setSavedValue] = useState<number | null>(value);
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep our local "savedValue" in sync if the row prop changes (e.g. after parent refresh).
  useEffect(() => { setSavedValue(value); }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(savedValue == null ? '' : String(savedValue));
    setEditing(true);
    setStatus('idle');
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(savedValue == null ? '' : String(savedValue));
  }

  function commit() {
    const parsed = parseInt(draft, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setStatus('err');
      setErrMsg('Invalid');
      setTimeout(() => setStatus('idle'), 1500);
      return;
    }
    if (parsed === savedValue) {
      setEditing(false);
      return;
    }
    setEditing(false);
    startSaving(async () => {
      try {
        const res = await onSave(parsed);
        if (res && 'error' in res && res.error) {
          setStatus('err');
          setErrMsg(res.error);
          setTimeout(() => setStatus('idle'), 2500);
          return;
        }
        setSavedValue(parsed);
        setStatus('ok');
        onSaved?.(parsed);
        setTimeout(() => setStatus('idle'), 1500);
      } catch (e: any) {
        setStatus('err');
        setErrMsg(e?.message ?? 'Save failed');
        setTimeout(() => setStatus('idle'), 2500);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          className="w-24 rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 focus:outline-none"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
          }}
          onBlur={commit}
        />
        <span className="text-[10px] text-gray-400 uppercase">cents</span>
      </div>
    );
  }

  const display = savedValue == null || (dashOnZero && savedValue === 0)
    ? <span className="text-gray-300">—</span>
    : formatCents(savedValue, currency);

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 text-left hover:bg-gray-100 transition-colors text-gray-700"
      title="Click to edit"
    >
      <span>{display}</span>
      {saving && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
      {status === 'ok' && <Check className="w-3 h-3 text-emerald-500" />}
      {status === 'err' && <AlertCircle className="w-3 h-3 text-red-500" />}
      {status === 'err' && <span className="text-[10px] text-red-500">{errMsg}</span>}
    </button>
  );
}
