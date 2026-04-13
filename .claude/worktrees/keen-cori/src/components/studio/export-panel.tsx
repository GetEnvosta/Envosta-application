'use client';

import { useState } from 'react';
import { Download, Folder, FileText, FileCode, Loader2, Check, AlertCircle } from 'lucide-react';

export function ExportPanel({
  projectId,
  project,
  pages,
}: {
  projectId: string;
  project: any;
  pages: any[];
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const pagesWithContent = pages.filter(p => p.html);
  const slug = project.slug || 'site';

  async function handleExport() {
    setExporting(true);
    setError('');

    try {
      const res = await fetch('/api/studio/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Export failed');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `envosta-theme-${slug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pagesWithContent.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {pagesWithContent.length > 0 ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {pagesWithContent.length} of {pages.length} pages generated
          </p>
          <p className="text-xs text-gray-500">
            {pagesWithContent.length === 0 ? 'Generate pages first before exporting' : 'Ready to export'}
          </p>
        </div>
      </div>

      {/* File tree */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Export Contents</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-600">
          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            envosta-theme-{slug}/
          </div>
          <div className="ml-5 space-y-1">
            <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-blue-500" /> theme.json</div>
            <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> style.css</div>
            <div className="flex items-center gap-2"><FileCode className="w-3 h-3 text-purple-500" /> functions.php</div>
            <div className="flex items-center gap-2 mt-2 text-gray-900 font-semibold">
              <Folder className="w-3 h-3 text-amber-500" /> templates/
            </div>
            <div className="ml-5 space-y-1">
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> index.html</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> front-page.html</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> page.html</div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-gray-900 font-semibold">
              <Folder className="w-3 h-3 text-amber-500" /> parts/
            </div>
            <div className="ml-5 space-y-1">
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> header.html</div>
              <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-gray-400" /> footer.html</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-gray-900 font-semibold">
            <FileCode className="w-3.5 h-3.5 text-green-500" />
            envosta-import-{slug}.php
          </div>
        </div>
      </div>

      {/* Pages included */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Pages Included</h3>
        <div className="space-y-1">
          {pages.map(page => (
            <div key={page.id} className="flex items-center gap-2 text-sm">
              {page.html ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
              )}
              <span className={page.html ? 'text-gray-700' : 'text-gray-400'}>{page.title}</span>
              {!page.html && <span className="text-[10px] text-gray-300">(not generated)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Download button */}
      <div>
        <button
          onClick={handleExport}
          disabled={exporting || pagesWithContent.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating ZIP...</>
          ) : (
            <><Download className="w-4 h-4" /> Download ZIP</>
          )}
        </button>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* Deployment instructions */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Deployment Instructions</h4>
        <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
          <li>Upload the theme folder to <code className="bg-blue-100 px-1 rounded">wp-content/themes/</code></li>
          <li>Activate the theme in <strong>Appearance &rarr; Themes</strong></li>
          <li>Upload the import plugin file to <code className="bg-blue-100 px-1 rounded">wp-content/plugins/</code></li>
          <li>Activate the plugin and click <strong>"Import Now"</strong> in the admin notice</li>
          <li>Review pages, then deactivate and delete the import plugin</li>
        </ol>
      </div>
    </div>
  );
}
