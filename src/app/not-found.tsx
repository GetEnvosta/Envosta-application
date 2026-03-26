import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f8f9fb' }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 24px' }}>
        <p style={{ fontSize: '5rem', fontWeight: 700, color: '#e5e7eb', margin: '0 0 8px', lineHeight: 1 }}>404</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111', margin: '0 0 12px' }}>Page not found</h1>
        <p style={{ fontSize: '.95rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 32px' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 20px', background: '#111', color: '#fff', borderRadius: 10, fontSize: '.875rem', fontWeight: 500, textDecoration: 'none' }}>
            Go home
          </Link>
          <Link href="/support" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 20px', background: '#fff', color: '#374151', borderRadius: 10, fontSize: '.875rem', fontWeight: 500, textDecoration: 'none', border: '1px solid #e5e7eb' }}>
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
