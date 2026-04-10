'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';

export function PartnerRating({ partnerId }: { partnerId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    if (!rating) return;
    setSaving(true);
    try {
      const res = await fetch('/api/partners/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, rating, comment: comment.trim() || undefined }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                s <= (hover || rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'
              }`}
            />
          </button>
        ))}
        {rating > 0 && <span className="text-sm text-gray-500 ml-2">{rating}/5</span>}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment about your experience..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none resize-none"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Your rating helps other clients and affects partner tiers.</p>
        <button
          onClick={handleSubmit}
          disabled={!rating || saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Submitted!' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
