'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f8f9fb' }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 24px' }}>
        <p style={{ fontSize: '5rem', fontWeight: 700, color: '#e5e7eb', margin: '0 0 8px', lineHeight: 1 }}>500</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111', margin: '0 0 12px' }}>Something went wrong</h1>
        <p style={{ fontSize: '.95rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 32px' }}>
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          onClick={reset}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 20px', background: '#111', color: '#fff', borderRadius: 10, fontSize: '.875rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
