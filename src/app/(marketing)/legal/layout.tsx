import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* ── Page Hero — white document header ── */
        .page-hero {
          padding: 120px 0 40px;
          position: relative;
          background: #fff;
        }
        .page-hero .c {
          position: relative;
          z-index: 1;
          max-width: 844px;
          margin: 0 auto;
        }
        .page-hero h1 {
          font-family: 'Inter', sans-serif;
          font-size: 1.8rem;
          font-weight: 500;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin-bottom: 8px;
          color: #111827;
        }
        .page-hero p {
          font-size: 0.9rem;
          color: #4b5563;
          line-height: 1.7;
          font-weight: 300;
          margin-top: 4px;
        }
        .page-hero .meta {
          font-size: 0.78rem;
          color: #9ca3af;
          margin-top: 10px;
          font-weight: 400;
        }
        .page-hero .divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin-top: 32px;
        }
        .page-hero-inner {
          max-width: 780px;
          margin: 0 auto;
        }

        /* ── Updated badge ── */
        .updated-badge {
          display: inline-block;
          font-size: 0.72rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 12px;
          border-radius: 100px;
          margin-bottom: 20px;
        }

        /* ── White content zone ── */
        .legal-zone {
          background: #fff;
          position: relative;
          z-index: 1;
        }

        /* ── Legal content — hardcoded light colors ── */
        .legal-wrap {
          max-width: 780px;
          padding: 0 0 100px;
          margin: 0 auto;
        }
        .legal-content h2 {
          font-family: 'Inter', sans-serif;
          font-size: 1.4rem;
          font-weight: 500;
          margin-bottom: 12px;
          padding-top: 56px;
          scroll-margin-top: 100px;
          color: #111827;
          line-height: 1.25;
          letter-spacing: -0.3px;
        }
        .legal-content h2:first-of-type {
          padding-top: 8px;
        }
        .legal-content h3 {
          font-family: 'Inter', sans-serif;
          font-size: 0.92rem;
          font-weight: 500;
          margin-bottom: 8px;
          margin-top: 24px;
          color: #111827;
        }
        .legal-content p {
          color: #374151;
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
          color: #374151;
          font-size: 0.88rem;
          line-height: 1.85;
          margin-bottom: 6px;
          font-weight: 300;
        }
        .legal-content li::marker {
          color: #6b7280;
        }
        .legal-content a {
          color: var(--gold);
          text-decoration: none;
          transition: color 0.2s;
        }
        .legal-content a:hover {
          color: var(--gold-bright);
        }
        .legal-divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 40px 0 0;
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
        .cookie-table th:first-child {
          border-radius: 8px 0 0 0;
        }
        .cookie-table th:last-child {
          border-radius: 0 8px 0 0;
        }
        .cookie-table td {
          padding: 12px 16px;
          color: #374151;
          font-weight: 300;
          border-bottom: 1px solid #e5e7eb;
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
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }

        /* ── GDPR Rights Cards ── */
        .gdpr-rights-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin: 28px 0 16px;
        }
        .gdpr-right-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 24px 28px;
        }
        .gdpr-right-card .icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(37, 99, 235, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          font-size: 1.1rem;
        }
        .gdpr-right-card h4 {
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: #111827;
          margin-bottom: 6px;
        }
        .gdpr-right-card p {
          font-size: 0.82rem;
          color: #1f2937;
          line-height: 1.7;
          margin-bottom: 0;
          font-weight: 300;
        }

        /* ── GDPR Info Banner ── */
        .gdpr-banner {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 28px 32px;
          margin: 28px 0 16px;
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .gdpr-banner .banner-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.2rem;
        }
        .gdpr-banner .banner-text h4 {
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: #111827;
          margin-bottom: 4px;
        }
        .gdpr-banner .banner-text p {
          font-size: 0.82rem;
          color: #1f2937;
          line-height: 1.7;
          margin-bottom: 0;
          font-weight: 300;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .page-hero {
            padding: 100px 0 32px;
          }
          .legal-wrap {
            padding: 0 24px 80px;
          }
          .cookie-table {
            font-size: 0.78rem;
          }
          .cookie-table th,
          .cookie-table td {
            padding: 10px 12px;
          }
          .gdpr-rights-grid {
            grid-template-columns: 1fr;
          }
          .gdpr-banner {
            flex-direction: column;
            gap: 14px;
          }
        }
      `}</style>
      {children}
    </>
  );
}
