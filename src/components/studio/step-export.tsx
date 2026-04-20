'use client';

import { useState } from 'react';
import { Download, Folder, FileText, FileCode, Loader2, Check, AlertCircle } from 'lucide-react';
import { buildWxrXml } from '@/lib/studio-wxr';

export function StepExport({
  projectId, project, styleConfig, pages, onAuthRequired,
}: {
  projectId: string;
  project: any;
  styleConfig: any;
  pages: any[];
  onAuthRequired?: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
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

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      // 1) Fetch the child-theme zip from the API
      const res = await fetch('/api/studio/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, pages, styleConfig }),
      });

      if (res.status === 401) {
        if (onAuthRequired) onAuthRequired();
        else setError('Please sign in to export');
        return;
      }

      if (!res.ok) {
        let detail = `Export failed (${res.status})`;
        try { detail = (await res.json())?.error || detail; } catch {}
        setError(detail);
        return;
      }

      const themeZip = await res.blob();
      triggerDownload(themeZip, `envosta-child-${slug}.zip`);

      // 2) Build the WXR content file client-side and trigger a second
      //    download. This keeps the two files separate so users can upload
      //    the theme zip directly to /wp-content/themes/ and import the
      //    .xml via Tools → Import after the theme is active.
      const siteName = (styleConfig?.siteName || project?.name || 'Site').toString();
      const xml = buildWxrXml(siteName, pages);
      const xmlBlob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      // Small delay to avoid some browsers suppressing the second download
      setTimeout(() => triggerDownload(xmlBlob, `content-${slug}.xml`), 250);
    } catch (err: any) {
      setError(err?.message || 'Export failed — please try again');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Ready to Export</h2>
          <p className="text-sm text-gray-500">{pagesWithContent.length} pages ready. Download the child theme and WXR import file.</p>
        </div>

        {/* Two separate downloads */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* File 1: theme zip */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 font-mono text-xs text-gray-600">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
              <Folder className="w-3.5 h-3.5 text-amber-500" /> envosta-child-{slug}.zip
            </div>
            <div className="ml-5 space-y-1">
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-blue-500" /> theme.json</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> style.css</div>
              <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-purple-500" /> functions.php</div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500 font-sans leading-snug">
              The child theme — upload to <code className="bg-white px-1 rounded">wp-content/themes/</code>.
            </p>
          </div>
          {/* File 2: WXR content */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 font-mono text-xs text-gray-600">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
              <FileCode className="w-3.5 h-3.5 text-green-500" /> content-{slug}.xml
            </div>
            <p className="ml-5 text-[11px] text-gray-500 font-sans leading-snug">
              WXR with {pagesWithContent.length} page{pagesWithContent.length === 1 ? '' : 's'} + a Main Menu containing every page. Import via <strong>Tools → Import → WordPress</strong> after activating the theme.
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
            {exporting ? 'Generating...' : 'Download both files'}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        {/* Deployment instructions */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Deployment to wp.cloud</h4>
          <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
            <li>Ensure the <strong>Assembler parent theme</strong> (by Automattic) is installed on the WordPress site</li>
            <li>Upload the <code className="bg-blue-100 px-1 rounded">envosta-child-{slug}</code> folder to <code className="bg-blue-100 px-1 rounded">wp-content/themes/</code></li>
            <li>Activate the child theme in <strong>Appearance → Themes</strong></li>
            <li>Go to <strong>Tools → Import → WordPress</strong> and upload <code className="bg-blue-100 px-1 rounded">content-{slug}.xml</code></li>
            <li>Set the homepage in <strong>Settings → Reading → A static page</strong></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
