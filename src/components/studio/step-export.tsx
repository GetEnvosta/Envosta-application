'use client';

import { useState } from 'react';
import { Download, Folder, FileText, FileCode, Loader2, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { buildWxrXml } from '@/lib/studio-wxr';

export function StepExport({
  projectId, project, styleConfig, pages, businessInfo, onAuthRequired, onBack,
}: {
  projectId: string;
  project: any;
  styleConfig: any;
  pages: any[];
  businessInfo?: any;
  onAuthRequired?: () => void;
  onBack?: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [parentSlug, setParentSlug] = useState('envosta');
  const [snippetCopied, setSnippetCopied] = useState(false);
  const slug = project.slug || 'site';
  const pagesWithContent = pages.filter(p => p.html);

  // One-time snippet the user drops into their Envosta parent theme's
  // functions.php. On WXR import, it reads the `_envosta_*` post-meta we
  // embed on the Home page, applies the values as site options, then
  // deletes the meta + pending flag. Idempotent: re-running does nothing.
  const parentHookSnippet = `// Envosta Studio — WXR-driven site setup.
// One-time hook: reads _envosta_* post-meta embedded on the Home page
// by the studio export, applies to site options, then cleans up.
add_action('import_end', 'envosta_apply_studio_site_setup');
function envosta_apply_studio_site_setup() {
    $pending = get_posts([
        'post_type'  => 'page',
        'meta_key'   => '_envosta_pending_setup',
        'meta_value' => '1',
        'posts_per_page' => 1,
        'post_status'    => 'any',
    ]);
    if (empty($pending)) return;
    $home_post = $pending[0];
    $home_id = $home_post->ID;

    $site_title     = get_post_meta($home_id, '_envosta_site_title', true);
    $tagline        = get_post_meta($home_id, '_envosta_site_tagline', true);
    $home_title     = get_post_meta($home_id, '_envosta_home_title', true) ?: 'Home';
    $blog_title     = get_post_meta($home_id, '_envosta_blog_title', true);
    $style_variation= get_post_meta($home_id, '_envosta_style_variation', true);
    $menu_name      = get_post_meta($home_id, '_envosta_menu_name', true) ?: 'Main Menu';

    if ($site_title) update_option('blogname', $site_title);
    if ($tagline)    update_option('blogdescription', $tagline);

    $home = get_page_by_title($home_title);
    if ($home instanceof WP_Post) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $home->ID);
    }
    if ($blog_title) {
        $blog = get_page_by_title($blog_title);
        if ($blog instanceof WP_Post && (!$home || $blog->ID !== $home->ID)) {
            update_option('page_for_posts', $blog->ID);
        }
    }

    $menu = wp_get_nav_menu_object($menu_name);
    if ($menu) {
        $locations = get_theme_mod('nav_menu_locations');
        if (!is_array($locations)) $locations = [];
        foreach (['primary', 'header-navigation', 'main', 'header'] as $loc) {
            $locations[$loc] = $menu->term_id;
        }
        set_theme_mod('nav_menu_locations', $locations);
    }

    if ($style_variation) set_theme_mod('envosta_active_variation', $style_variation);

    if (get_option('permalink_structure') === '') {
        update_option('permalink_structure', '/%postname%/');
        flush_rewrite_rules(false);
    }

    // Clean up so the hook is a no-op on subsequent imports.
    foreach ([
        '_envosta_site_title', '_envosta_site_tagline',
        '_envosta_home_title', '_envosta_blog_title',
        '_envosta_style_variation', '_envosta_menu_name',
        '_envosta_pending_setup',
    ] as $k) delete_post_meta($home_id, $k);
}`;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(parentHookSnippet);
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 2000);
    } catch {
      setError('Clipboard copy failed — select and copy manually below.');
    }
  }

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

  const effectiveMode = styleConfig?.mode === 'preset' ? 'custom' : (styleConfig?.mode || 'parent');
  const fullCustom = effectiveMode === 'custom';

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      // Site Settings panel overrides win; otherwise fall back to the brief
      // businessInfo and then to project metadata.
      const siteName = (
        businessInfo?.siteName ||
        businessInfo?.businessName ||
        styleConfig?.siteName ||
        project?.name ||
        'Site'
      ).toString();
      const tagline = (businessInfo?.tagline || '').toString();
      const homePageTitle = (businessInfo?.homePageTitle || 'Home').toString();
      const blogPageTitle = (businessInfo?.blogPageTitle || (pages.some((p: any) => p.title === 'Blog') ? 'Blog' : '')).toString();
      const menuName = (businessInfo?.menuName || 'Main Menu').toString();

      // WXR with site-settings meta on the Home page. The Envosta parent
      // theme's import_end hook reads these + applies them to options.
      const xml = buildWxrXml(siteName, pages, {
        menuName,
        siteSettings: {
          siteName,
          tagline,
          homePageTitle,
          blogPageTitle: blogPageTitle || undefined,
          styleVariation: styleConfig?.presetId ? String(styleConfig.presetId).replace(/^assembler-/, '') : undefined,
          menuName,
        },
      });
      const xmlBlob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      triggerDownload(xmlBlob, `content-${slug}.xml`);

      // Child theme ONLY in Full Custom mode (for the per-field style
      // overrides). Parent mode relies entirely on the parent's import_end
      // hook to auto-configure.
      if (fullCustom) {
        const res = await fetch('/api/studio/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project, pages, styleConfig,
            parentSlug: parentSlug.trim() || 'envosta',
            siteName, tagline,
          }),
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
        setTimeout(async () => triggerDownload(await res.blob(), `envosta-child-${slug}.zip`), 250);
      }
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

        {/* Style-variation activation note (Parent mode) */}
        {!fullCustom && styleConfig?.presetId && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <p className="text-xs font-medium text-indigo-700">Activate this style variation after import</p>
            <p className="text-[11px] text-indigo-700/80 mt-1 leading-snug">
              This site was designed with the Envosta parent theme's
              <strong> "{String(styleConfig.presetId).replace(/^assembler-/, '')}" </strong> style variation.
              After importing the XML, go to <strong>Appearance → Editor → Styles</strong> and pick that variation so the site renders with the intended palette + typography. No child theme is needed when Full Custom is off.
            </p>
          </div>
        )}

        {/* Parent theme slug — only relevant when shipping a child theme (Full Custom) */}
        {fullCustom && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Parent theme folder name</label>
            <input
              type="text"
              value={parentSlug}
              onChange={e => setParentSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="envosta"
            />
            <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
              Folder name of the parent theme inside <code className="bg-white px-1 rounded">wp-content/themes/</code>. Default is <code className="bg-white px-1 rounded">envosta</code>. Change to <code className="bg-white px-1 rounded">assembler</code> to run on stock Automattic Assembler instead.
            </p>
          </div>
        )}

        {/* One-time parent-theme hook snippet */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-semibold text-amber-900">Parent theme setup hook — paste once</p>
              <p className="text-[11px] text-amber-800/80 mt-1 leading-snug">
                Drop this into the Envosta parent theme's <code className="bg-white px-1 rounded">functions.php</code> once. After that, every studio-exported WXR auto-applies site title, tagline, static homepage, posts page, Main Menu location, and the picked style variation on import — no manual trips to Settings → Reading.
              </p>
            </div>
            <button
              onClick={copySnippet}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              {snippetCopied ? <Check className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
              {snippetCopied ? 'Copied' : 'Copy snippet'}
            </button>
          </div>
          <details className="text-[11px] text-amber-900/80">
            <summary className="cursor-pointer hover:text-amber-900">Show snippet</summary>
            <pre className="mt-2 max-h-64 overflow-auto bg-white/80 border border-amber-200 rounded p-2 font-mono text-[10px] leading-snug whitespace-pre-wrap">{parentHookSnippet}</pre>
          </details>
        </div>

        {/* Downloads — WXR always, child theme only in Full Custom */}
        <div className={`grid gap-4 ${fullCustom ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-600">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
              <FileCode className="w-3.5 h-3.5 text-green-500" /> content-{slug}.xml
            </div>
            <p className="ml-5 text-[11px] text-gray-500 font-sans leading-snug">
              WXR with {pagesWithContent.length} page{pagesWithContent.length === 1 ? '' : 's'} as real Gutenberg blocks + a Main Menu. Site title, tagline, homepage, posts page, and style variation are embedded as post-meta on the Home page — the parent theme's setup hook applies them on import.
            </p>
          </div>
          {fullCustom && (
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
                Child theme carrying your Full Custom palette / fonts / radius overrides. Install + activate before importing the XML.
              </p>
            </div>
          )}
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
            {exporting ? 'Generating...' : fullCustom ? 'Download both files' : 'Download WXR'}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        {/* Deployment instructions */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Deployment to wp.cloud</h4>
          <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
            <li>One-time: paste the <strong>Parent theme setup hook</strong> above into <code className="bg-blue-100 px-1 rounded">envosta/functions.php</code>. This is a once-per-server step — every future studio export will be picked up by this hook.</li>
            <li>Confirm the Envosta parent theme is installed + active on the destination site.</li>
            {fullCustom && (
              <li>Upload <code className="bg-blue-100 px-1 rounded">envosta-child-{slug}.zip</code> via <strong>Appearance → Themes → Add New → Upload Theme</strong>, then <strong>Activate</strong> it.</li>
            )}
            <li>Go to <strong>Tools → Import → WordPress</strong> and upload <code className="bg-blue-100 px-1 rounded">content-{slug}.xml</code>. Assign content to yourself when prompted. Keep "Download and import file attachments" off unless you need external media.</li>
            <li>Done — the setup hook applies site title / tagline / homepage / posts page / Main Menu location automatically on import.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
