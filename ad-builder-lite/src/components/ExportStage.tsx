import { useEffect, useRef, useState } from 'react';
import type { AnyEl, CanvasPreset } from '../Types';
import { exportJSON, exportHTML5Banner } from '../utils/exporters';

type ExportStageProps = {
  open: boolean;
  onClose: () => void;
  elements: AnyEl[];
  preset: CanvasPreset;
};

type TabKey = 'html5' | 'json';

export default function ExportStage({ open, onClose, elements, preset }: ExportStageProps) {
 
  const safeElements = Array.isArray(elements) ? elements : [];
  const [tab, setTab] = useState<TabKey>('html5');
  const [clickUrl, setClickUrl] = useState('https://example.com');
  const [title, setTitle] = useState('Ad Builder Banner');
  const [htmlFilename, setHtmlFilename] = useState('banner');
  const [jsonFilename, setJsonFilename] = useState('ad-builder');
  const [isBusy, setBusy] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  
  if (!open) return null;

    // Validation
  const canExport = tab === 'html5'
    ? !!clickUrl && !!title && safeElements.length > 0
    : safeElements.length > 0;

  const doExport = async () => {
    try {
      setBusy(true);
      if (tab === 'html5') {
        await exportHTML5Banner(safeElements, preset, { clickUrl, title });
      } else {
        await Promise.resolve(exportJSON(safeElements));
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Export failed. See console for details.');
    } finally {
      setBusy(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-neutral-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold">Export</h2>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="inline-flex rounded-xl border border-neutral-200 p-1 bg-neutral-50">
            <button
              onClick={() => setTab('html5')}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'html5' ? 'bg-white shadow border border-neutral-200' : 'text-neutral-600'}`}
            >
              HTML5 Banner
            </button>
            <button
              onClick={() => setTab('json')}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'json' ? 'bg-white shadow border border-neutral-200' : 'text-neutral-600'}`}
            >
              JSON
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {tab === 'html5' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Click-through URL (clickTag)</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  type="url"
                  placeholder="https://example.com"
                  value={clickUrl}
                  onChange={(e) => setClickUrl(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Will be injected as <code>window.clickTag</code>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Banner title</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  type="text"
                  placeholder="Ad Builder Banner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Filename (optional)</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  type="text"
                  placeholder="banner"
                  value={htmlFilename}
                  onChange={(e) => setHtmlFilename(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-700">
                <div className="font-medium mb-1">Current preset</div>
                <div>Exporting for: <span className="font-mono">{preset}</span></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Filename (optional)</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  type="text"
                  placeholder="ad-builder"
                  value={jsonFilename}
                  onChange={(e) => setJsonFilename(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-700">
                <div className="font-medium mb-1">What’s included</div>
                <ul className="list-disc pl-5">
                  <li>All elements currently in the canvas</li>
                  <li>Properties as defined in <code>AnyEl</code></li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-200">
          <button className="btn" onClick={onClose} disabled={isBusy}>Cancel</button>
          <button className="btn" disabled={!canExport || isBusy} onClick={doExport}>
            {isBusy ? 'Exporting…' : tab === 'html5' ? 'Export HTML5' : 'Export JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
