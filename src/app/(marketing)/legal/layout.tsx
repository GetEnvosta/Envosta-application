import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* ── Legal Pages — Clean single-column document ── */
        .legal-hero {
          padding: 140px 0 48px;
          background: #fff;
        }
        .legal-hero .c {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 32px;
        }
        .legal-hero h1 {
          font-family: 'Inter', sans-serif;
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: -0.5px;
          line-height: 1.2;
          color: #111827;
          margin-bottom: 8px;
        }
        .legal-hero p {
          font-size: 0.92rem;
          color: #6b7280;
          line-height: 1.7;
          font-weight: 300;
        }
        .legal-hero .meta,
        .legal-hero .updated-badge {
          display: inline-block;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 8px;
        }

        /* ── Content zone ── */
        .legal-zone {
          background: #fff;
        }
        .legal-wrap {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 32px 100px;
        }

        /* ── Typography ── */
        .legal-content h2 {
          font-family: 'Inter', sans-serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #111827;
          margin-top: 48px;
          margin-bottom: 12px;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .legal-content h2:first-of-type {
          margin-top: 32px;
        }
        .legal-content h3 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
          margin-top: 24px;
          margin-bottom: 8px;
        }
        .legal-content p {
          color: #4b5563;
          font-size: 0.9rem;
          line-height: 1.85;
          margin-bottom: 14px;
          font-weight: 300;
        }
        .legal-content p strong {
          color: #111827;
          font-weight: 500;
        }
        .legal-content ul,
        .legal-content ol {
          margin: 0 0 16px 20px;
        }
        .legal-content li {
          color: #4b5563;
          font-size: 0.88rem;
          line-height: 1.85;
          margin-bottom: 6px;
          font-weight: 300;
        }
        .legal-content li::marker {
          color: #9ca3af;
        }
        .legal-content a {
          color: #2563eb;
          text-decoration: none;
        }
        .legal-content a:hover {
          text-decoration: underline;
        }

        /* ── Hide all dividers — clean flow ── */
        .legal-divider,
        .legal-hero .divider {
          display: none;
        }

        /* ── Cookie Table ── */
        .cookie-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0 16px;
          font-size: 0.84rem;
        }
        .cookie-table th {
          text-align: left;
          padding: 12px 16px;
          background: #f9fafb;
          color: #111827;
          font-weight: 500;
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }
        .cookie-table td {
          padding: 12px 16px;
          color: #4b5563;
          font-weight: 300;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
          line-height: 1.7;
        }
        .cookie-table tr:last-child td {
          border-bottom: none;
        }
        .cookie-table code {
          background: #f3f4f6;
          color: #111827;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
          white-space: nowrap;
        }

        /* ── GDPR Cards ── */
        .gdpr-rights-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 24px 0 16px;
        }
        .gdpr-right-card {
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 12px;
          padding: 20px 24px;
        }
        .gdpr-right-card .icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(37, 99, 235, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          font-size: 1rem;
        }
        .gdpr-right-card h4 {
          font-size: 0.88rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .gdpr-right-card p {
          font-size: 0.82rem;
          color: #4b5563;
          line-height: 1.7;
          margin-bottom: 0;
        }
        .gdpr-banner {
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0 16px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .gdpr-banner .banner-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.1rem;
        }
        .gdpr-banner .banner-text h4 {
          font-size: 0.88rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .gdpr-banner .banner-text p {
          font-size: 0.82rem;
          color: #4b5563;
          line-height: 1.7;
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .legal-hero { padding: 110px 0 36px; }
          .legal-hero h1 { font-size: 1.6rem; }
          .legal-wrap { padding: 0 20px 60px; }
          .legal-hero .c { padding: 0 20px; }
          .gdpr-rights-grid { grid-template-columns: 1fr; }
          .gdpr-banner { flex-direction: column; gap: 12px; }
        }
      `}</style>
      {children}
    </>
  );
}
