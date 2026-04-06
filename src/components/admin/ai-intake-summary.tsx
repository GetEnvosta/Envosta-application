'use client';

import { Sparkles } from 'lucide-react';

export function AiIntakeSummary({ summary }: { summary: string }) {
  if (!summary) return null;

  return (
    <div style={{
      background: 'rgba(139,92,246,.06)',
      border: '1px solid rgba(139,92,246,.2)',
      borderRadius: 16,
      padding: '24px 28px',
      marginTop: 20,
      maxWidth: 520,
      marginLeft: 'auto',
      marginRight: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Sparkles style={{ width: 18, height: 18, color: '#8b5cf6' }} />
        <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          AI Sales Summary
        </span>
      </div>
      <div style={{
        fontSize: '.88rem',
        color: 'var(--t1)',
        lineHeight: 1.7,
        fontWeight: 300,
        whiteSpace: 'pre-wrap',
      }}>
        {summary.split('\n').map((line, i) => {
          // Bold headers
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={i} style={{ fontWeight: 600, color: 'var(--t1)', marginTop: i > 0 ? 12 : 0, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</p>;
          }
          if (line.match(/^\*\*.*\*\*/)) {
            const parts = line.split('**');
            return (
              <p key={i} style={{ marginTop: 10, marginBottom: 2 }}>
                {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ fontWeight: 600 }}>{p}</strong> : p)}
              </p>
            );
          }
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return <p key={i} style={{ paddingLeft: 14, marginBottom: 2 }}>• {line.slice(2)}</p>;
          }
          if (line.trim() === '') return <br key={i} />;
          return <p key={i} style={{ marginBottom: 2 }}>{line}</p>;
        })}
      </div>
    </div>
  );
}
