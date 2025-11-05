// utils/exporters.ts
import type { AnyEl, TextEl, ImageEl, ButtonEl, CanvasPreset, TimelineState } from '../Types';
import { getAnimatedElement } from './animation';
import { useEditorStore } from '../store/useEditorStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ---------------- JSON exporters ----------------
export function exportJSON(elements: AnyEl[]) {
    const blob = new Blob([JSON.stringify(elements, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ad.json'; a.click();
    URL.revokeObjectURL(url);
}

export async function importJSONDialog() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
            const data = JSON.parse(text);
            useEditorStore.getState().importJSON(data);
        } catch {
            alert('Invalid JSON file');
        }
    };
    input.click();
}

// ---------------- HTML5 banner exporter ----------------
function isDataURL(s: string) {
    return /^data:image\/(png|jpe?g|gif|webp);base64,/.test(s);
}

function dataURLtoBlob(dataUrl: string) {
    const [head, body] = dataUrl.split(',');
    const mime = head.match(/data:([^;]+);/)?.[1] ?? 'image/png';
    const bin = atob(body);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return { blob: new Blob([u8], { type: mime }), ext: mimeToExt(mime) };
}

function mimeToExt(mime: string) {
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    return 'bin';
}


const DESIGN = { w: 970, h: 250 }; // canonical design space (matches CanvasStage)
const sizes: Record<CanvasPreset, { w: number; h: number; meta: string; label: string }> = {
    desktop: { w: 970, h: 250, meta: 'width=970,height=250', label: 'Desktop 970×250' },
    tablet: { w: 728, h: 90, meta: 'width=728,height=90', label: 'Tablet 728×90' },
    mobile: { w: 320, h: 100, meta: 'width=320,height=100', label: 'Mobile 320×100' },
};

type ExportOptions = {
    clickUrl: string;            // required by ad networks as window.clickTag
    title?: string;              // <title>
    backgroundColor?: string;    // banner background (default white)
};
function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ch === '&' ? '&amp;' :
            ch === '<' ? '&lt;' :
                ch === '>' ? '&gt;' :
                    ch === '"' ? '&quot;' : '&#39;'
    );
}


export async function exportHTML5Banner(
    elements: AnyEl[],
    preset: CanvasPreset,
    opts: ExportOptions
) {
    const { w, h, meta } = sizes[preset];
    const sx = w / DESIGN.w;
    const sy = h / DESIGN.h;

    const zip = new JSZip();
    const assets = zip.folder('assets')!;

    // Deduplicate embedded images (data URLs) → add to /assets and map to filenames
    const imageMap = new Map<string, string>(); // dataURL -> "assets/name.ext"
    const addImageFromDataURL = (dataUrl: string, name: string) => {
        const { blob, ext } = dataURLtoBlob(dataUrl);
        const filename = `assets/${name}.${ext}`;
        assets.file(`${name}.${ext}`, blob);
        imageMap.set(dataUrl, filename);
        return filename;
    };

    const layers: string[] = [];

    for (const el of elements) {
        const rot = (el as any).rotation ?? 0;
        const op = (el as any).opacity ?? 1;
        const baseStyle = (
            left: number, top: number, width?: number, height?: number, extra = ''
        ) =>
            `position:absolute;left:${left * sx}px;top:${top * sy}px;` +
            (width != null ? `width:${width * sx}px;` : '') +
            (height != null ? `height:${height * sy}px;` : '') +
            `opacity:${op};transform-origin:0 0;transform:rotate(${rot}deg);${extra}`;

        if (el.type === 'text') {
            const t = el as TextEl;
            const fs = Math.max(1, (t.fontSize ?? 16) * sy);
            layers.push(
                `<div class="layer text" style="${baseStyle(t.x, t.y, t.width, t.height, `color:${t.fill ?? '#111'};font-size:${fs}px;line-height:1.15;font-weight:600;white-space:pre-wrap;`)}">${escapeHtml(t.text ?? '')}</div>`
            );
            continue;
        }

        if (el.type === 'image') {
            const i = el as ImageEl;
            let src = i.src;
            if (isDataURL(src)) src = imageMap.get(src) ?? addImageFromDataURL(src, `img_${i.id}`);
            layers.push(
                `<img class="layer image" src="./${src}" alt="" style="${baseStyle(i.x, i.y, i.width, i.height, 'object-fit:cover;')}">`
            );
            continue;
        }

        if (el.type === 'button') {
            const b = el as ButtonEl;
            let bg = `background:${b.fill ?? '#2563eb'};`;
            if (b.bgType === 'image' && b.bgImageSrc) {
                let bgSrc = b.bgImageSrc;
                if (isDataURL(bgSrc)) bgSrc = imageMap.get(bgSrc) ?? addImageFromDataURL(bgSrc, `btnbg_${b.id}`);
                const fit = b.imageFit ?? 'stretch';
                const sizeRule = fit === 'contain' ? 'contain' : fit === 'cover' ? 'cover' : '100% 100%';
                bg = `background-image:url('./${bgSrc}');background-repeat:no-repeat;background-position:center;background-size:${sizeRule};`;
            }
            layers.push(
                `<div class="layer button" style="${baseStyle(b.x, b.y, b.width, b.height, `border-radius:12px;display:flex;align-items:center;justify-content:center;${bg}`)}"><span style="color:${b.textColor ?? '#fff'};font-weight:600;">${escapeHtml(b.label ?? 'Button')}</span></div>`
            );
            continue;
        }
    }

const html = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="ad.size" content="${meta}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title ?? 'HTML5 Banner')}</title>
  <style>
    html,body{margin:0;padding:0}
    #banner{width:${w}px;height:${h}px;position:relative;overflow:hidden;background:${opts.backgroundColor ?? '#fff'};cursor:pointer;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    .layer{will-change:transform,opacity}
    .text,.image,.button{animation:fadeIn 300ms ease-out both}
    @keyframes fadeIn{from{opacity:0;transform:scale(0.98)}to{opacity:1;transform:scale(1)}}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  </style>
  <script>
    window.clickTag = window.clickTag || ${JSON.stringify(opts.clickUrl)};
  </script>
</head>
<body>
  <div id="banner" role="button" aria-label="Open advertiser site">
${layers.join('\n')}
    <span class="sr-only">Open advertiser site</span>
  </div>
  <script>
    document.getElementById('banner').addEventListener('click', function () {
      window.open(window.clickTag, '_blank');
    });
  </script>
</body>
</html>`;

    zip.file('index.html', html);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `banner_${w}x${h}.zip`);
}