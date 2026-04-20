'use client';

import { useState } from 'react';
import { Download, Folder, FileText, FileCode, Loader2, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { buildWxrXml } from '@/lib/studio-wxr';

export function StepExport({
  projectId, project, styleConfig, pages, onAuthRequired, onBack,
}: {
  projectId: string;
  project: any;
  styleConfig: any;
  pages: any[];
  onAuthRequired?: () => void;
  onBack?: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [parentSlug, setParentSlug] = useState('envosta-theme');
  const slug = project.slug || 'site';
  const pagesWithContent = pages.filter(p => p.html);

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fetchZip(target: 'parent' | 'child'): Promise<Blob | null> {
    const res = await fetch('/api/studio/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, pages, styleConfig, parentSlug: parentSlug.trim() || 'envosta-theme', target }),
    });
    if (res.status === 401) {
      if (onAuthRequired) onAuthRequired();
      else setError('Please sign in to export');
      return null;
    }
    if (!res.ok) {
      let detail = `Export failed (${res.status})`;
      try { detail = (await res.json())?.error || detail; } catch {}
      setError(detail);
      return null;
    }
    return await res.blob();
  }

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      // 1) Envosta parent theme
      const parentZip = await fetchZip('parent');
      if (!parentZip) return;
      triggerDownload(parentZip, 'envosta-theme.zip');

      // 2) Child theme
      const childZip = await fetchZip('child');
      if (!childZip) return;
      setTimeout(() => triggerDownload(childZip, `envosta-child-${slug}.zip`), 250);

      // 3) WXR content XML (built client-side from the shared studio-wxr lib)
      const siteName = (styleConfig?.siteName || project?.name || 'Site').toString();
      const xml = buildWxrXml(siteName, pages);
      const xmlBlob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      setTimeout(() => triggerDownload(xmlBlob, `content-${slug}.xml`), 500);
    } catch (err: any) {
      setError(err?.message || 'Export failed — please try again');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-2xl w-full space-y-6">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Design
          </button>
        )}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Ready to Export</h2>
          <p className="text-sm text-gray-500">{pagesWithContent.length} pages ready. Download the child theme and WXR import file.</p>
        </div>

        {/* Parent theme slug — must match the installed parent folder name */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Parent theme folder name</label>
          <input
            type="text"
            value={parentSlug}
            onChange={e => setParentSlug(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="envosta-theme"
          />
          <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
            Folder name of the parent theme inside <code className="bg-white px-1 rounded">wp-content/themes/</code>. Default is <code className="bg-white px-1 rounded">envosta-theme</code> (the parent you're downloading below). Change to <code className="bg-white px-1 rounded">assembler</code> to run on stock Automattic Assembler instead.
          </p>
        </div>

        {/* Three separate downloads */}
        <div className="grid sm:grid-cols-3 gap-3">
          {/* 1. Envosta parent theme */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-600">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
              <Folder className="w-3.5 h-3.5 text-purple-500" /> envosta-theme.zip
            </div>
            <div className="ml-5 space-y-1">
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-blue-500" /> theme.json</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> style.css</div>
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-purple-500" /> functions.php</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> templates/</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> parts/</div>
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-green-500" /> assets/woocommerce.css</div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500 font-sans leading-snug">
              The Envosta parent theme. Upload once per server. Bakes in Assembler-style FSE defaults + Shopify-style WooCommerce styling.
            </p>
          </div>
          {/* 2. Child theme */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-600">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
              <Folder className="w-3.5 h-3.5 text-amber-500" /> envosta-child-{slug}.zip
            </div>
            <div className="ml-5 space-y-1">
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-blue-500" /> theme.json</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> style.css</div>
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-purple-500" /> functions.php</div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500 font-sans leading-snug">
              The site-specific child theme. Override colors / fonts / radius; the layout inherits from Envosta parent.
            </p>
          </div>
          {/* 3. WXR content */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-600">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
              <FileCode className="w-3.5 h-3.5 text-green-500" /> content-{slug}.xml
            </div>
            <p className="ml-5 text-[11px] text-gray-500 font-sans leading-snug">
              WXR with {pagesWithContent.length} page{pagesWithContent.length === 1 ? '' : 's'} + a Main Menu. Import via <strong>Tools → Import → WordPress</strong>.
            </p>
          </div>
        </div>

        {/* Pages included */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Pages in Export</h3>
          <div className="space-y-1">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-2 text-sm">
                {page.html ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-300" />}
                <span className={page.html ? 'text-gray-700' : 'text-gray-400'}>{page.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download */}
        <div className="text-center">
          <button
            onClick={handleExport}
            disabled={exporting || pagesWithContent.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating...' : 'Download all three files'}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        {/* Deployment instructions */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Deployment to wp.cloud</h4>
          <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
            <li>Upload <code className="bg-blue-100 px-1 rounded">envosta-theme.zip</code> via <strong>Appearance → Themes → Add New → Upload Theme</strong>. Do NOT activate it yet.</li>
            <li>Upload <code className="bg-blue-100 px-1 rounded">envosta-child-{slug}.zip</code> the same way, then <strong>Activate</strong> the child theme.</li>
            <li>Go to <strong>Tools → Import → WordPress</strong> and upload <code className="bg-blue-100 px-1 rounded">content-{slug}.xml</code>. Assign content to yourself when prompted.</li>
            <li>Go to <strong>Appearance → Menus</strong>, find "Main Menu", assign it to the Primary location.</li>
            <li>Set the homepage in <strong>Settings → Reading → A static page</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
