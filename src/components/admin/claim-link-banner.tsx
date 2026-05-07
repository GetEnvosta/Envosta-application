'use client';

/**
 * Claim-link banner for unclaimed customer accounts on the admin
 * customer detail page. Shows the claim URL with a one-click copy
 * button so admins/partners can re-share the link with the client
 * if they lost the original email.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

export function ClaimLinkBanner({
  claimUrl,
  expiresAt,
}: {
  claimUrl: string;
  expiresAt: string | null;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="card mb-6 border-amber-200 bg-amber-50/40">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Unclaimed account
          </h3>
          {expired ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">expired</span>
          ) : expiresLabel ? (
            <span className="text-xs text-gray-500">expires {expiresLabel}</span>
          ) : null}
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Share this link with the customer so they can set a password and activate their site.
        </p>
        <div className="bg-white rounded-lg border border-amber-200 px-3 py-2 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={claimUrl}
            className="flex-1 text-xs font-mono text-gray-700 bg-transparent outline-none"
          />
          <button
            onClick={copy}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
            title="Copy link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
            title="Open"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
