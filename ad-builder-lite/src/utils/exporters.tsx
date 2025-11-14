// utils/exporters.ts
import type { AnyEl, TextEl, ImageEl, ButtonEl, CanvasPreset, TimelineState } from '../Types';
import { getAnimatedElement } from './animation';
import { useEditorStore } from '../store/useEditorStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

//Elements used for both JSON and HTML5 exporters and importers
interface ExportData{
    elements: AnyEl[];
    timeline: TimelineState;
    preset: CanvasPreset;
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

function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ch === '&' ? '&amp;' :
            ch === '<' ? '&lt;' :
                ch === '>' ? '&gt;' :
                    ch === '"' ? '&quot;' : '&#39;'
    );
}

function getScale(preset: CanvasPreset) {
  const { w, h } = sizes[preset];
  return {
    sx: w / DESIGN.w,
    sy: h / DESIGN.h,
    w,
    h,
  };
}

type AnimatedZipOptions = {
  title?: string;
  backgroundColor?: string; 
  clickUrl?: string;       
  filenameBase?: string;    
};

export async function exportHTML5Banner(
    elements: AnyEl[],
    preset: CanvasPreset,
    opts: ExportOptions
) {
    const { sx, sy, w, h } = getScale(preset);

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


export function exportAnimatedHTML(data: ExportData): string {
    const { elements, timeline, preset } = data;
    const size = sizes[preset];
    
    // Generate CSS animations for each animated element
    const generateCSSAnimations = () => {
        let css = '';
        
        timeline.tracks.forEach(track => {
            const element = elements.find(e => e.id === track.elementId);
            if (!element || track.keyframes.length === 0) return;
            
            // Group keyframes by property
            const propertiesMap = new Map<string, any[]>();
            track.keyframes.forEach(kf => {
                if (!propertiesMap.has(kf.property)) {
                    propertiesMap.set(kf.property, []);
                }
                propertiesMap.get(kf.property)!.push(kf);
            });

            // Generate CSS keyframes for each property
            propertiesMap.forEach((keyframes, property) => {
                if (keyframes.length === 0) return;
                
                keyframes.sort((a, b) => a.time - b.time);
                
                const animationName = `${element.id}-${property}`;
                css += `@keyframes ${animationName} {\n`;
                
                keyframes.forEach(kf => {
                    const percentage = (kf.time / timeline.duration) * 100;
                    let cssValue = '';
                    
                    if (property === 'position') {
                        const pos = kf.value as { x: number; y: number };
                        cssValue = `transform: translate(${pos.x}px, ${pos.y}px) rotate(${element.rotation || 0}deg);`;
                    } else if (property === 'opacity') {
                        cssValue = `opacity: ${kf.value};`;
                    } else if (property === 'rotation') {
                        cssValue = `transform: translate(${element.x}px, ${element.y}px) rotate(${kf.value}deg);`;
                    } else if (property === 'width' || property === 'height') {
                        cssValue = `${property}: ${kf.value}px;`;
                    }
                    
                    css += `  ${percentage.toFixed(2)}% { ${cssValue} }\n`;
                });
                
                css += `}\n\n`;
            });
        });
        
        return css;
    };

    // Generate CSS for element styling and animations
    const generateElementCSS = () => {
        let css = '';
        
        elements.forEach(element => {
            const track = timeline.tracks.find(t => t.elementId === element.id);
            const hasAnimations = track && track.keyframes.length > 0;
            
            css += `#${element.id} {\n`;
            css += `  position: absolute;\n`;
            css += `  left: ${element.x}px;\n`;
            css += `  top: ${element.y}px;\n`;
            css += `  width: ${element.width}px;\n`;
            css += `  height: ${element.height}px;\n`;
            css += `  opacity: ${element.opacity || 1};\n`;
            
            if (element.rotation) {
                css += `  transform: rotate(${element.rotation}deg);\n`;
            }
            
            // Element-specific styles
            if (element.type === 'text') {
                const textEl = element as any;
                css += `  font-size: ${textEl.fontSize}px;\n`;
                css += `  color: ${textEl.fill || '#000'};\n`;
                css += `  font-family: ${textEl.fontFamily || 'Arial, sans-serif'};\n`;
                css += `  display: flex;\n`;
                css += `  align-items: center;\n`;
                css += `  justify-content: center;\n`;
            } else if (element.type === 'image') {
                const imgEl = element as any;
                css += `  background-image: url('${imgEl.src}');\n`;
                css += `  background-size: ${imgEl.imageFit || 'cover'};\n`;
                css += `  background-position: center;\n`;
                css += `  background-repeat: no-repeat;\n`;
            } else if (element.type === 'button') {
                const btnEl = element as any;
                css += `  background-color: ${btnEl.fill || '#2563eb'};\n`;
                css += `  color: ${btnEl.textColor || '#fff'};\n`;
                css += `  border: none;\n`;
                css += `  border-radius: 4px;\n`;
                css += `  cursor: pointer;\n`;
                css += `  display: flex;\n`;
                css += `  align-items: center;\n`;
                css += `  justify-content: center;\n`;
                css += `  font-weight: 600;\n`;
                
                if (btnEl.bgType === 'image' && btnEl.bgImageSrc) {
                    css += `  background-image: url('${btnEl.bgImageSrc}');\n`;
                    css += `  background-size: ${btnEl.imageFit || 'cover'};\n`;
                    css += `  background-position: center;\n`;
                }
            }
            
            // Add animations if they exist
            if (hasAnimations) {
                const animationNames: string[] = [];
                const propertiesMap = new Map<string, any[]>();
                
                track!.keyframes.forEach(kf => {
                    if (!propertiesMap.has(kf.property)) {
                        propertiesMap.set(kf.property, []);
                        animationNames.push(`${element.id}-${kf.property}`);
                    }
                });
                
                if (animationNames.length > 0) {
                    css += `  animation: ${animationNames.join(', ')};\n`;
                    css += `  animation-duration: ${timeline.duration}s;\n`;
                    css += `  animation-timing-function: ease-out;\n`;
                    css += `  animation-fill-mode: both;\n`;
                    
                    if (timeline.loop) {
                        css += `  animation-iteration-count: infinite;\n`;
                    }
                }
            }
            
            css += `}\n\n`;
        });
        
        return css;
    };

    // Generate HTML elements
    const generateHTML = () => {
        let html = '';
        
        elements.forEach(element => {
            if (element.type === 'text') {
                const textEl = element as any;
                html += `    <div id="${element.id}" class="element text-element">${textEl.text}</div>\n`;
            } else if (element.type === 'image') {
                html += `    <div id="${element.id}" class="element image-element"></div>\n`;
            } else if (element.type === 'button') {
                const btnEl = element as any;
                const href = btnEl.href ? ` href="${btnEl.href}"` : '';
                const target = btnEl.href ? ' target="_blank"' : '';
                
                if (btnEl.href) {
                    html += `    <a id="${element.id}" class="element button-element"${href}${target}>${btnEl.label}</a>\n`;
                } else {
                    html += `    <button id="${element.id}" class="element button-element">${btnEl.label}</button>\n`;
                }
            }
        });
        
        return html;
    };

    // Complete HTML template
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animated Banner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        .banner-container {
            position: relative;
            width: ${size.w}px;
            height: ${size.h}px;
            background: white;
            border: 1px solid #ddd;
            overflow: hidden;
            margin: 20px auto;
        }
        
        .element {
            position: absolute;
            user-select: none;
        }
        
        .text-element {
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        }
        
        .button-element {
            text-decoration: none;
            transition: opacity 0.2s ease;
        }
        
        .button-element:hover {
            opacity: 0.9;
        }
        
        /* Generated keyframe animations */
${generateCSSAnimations()}
        
        /* Element-specific styles */
${generateElementCSS()}
    </style>
</head>
<body>
    <div class="banner-container">
${generateHTML()}
    </div>
    
    <script>
        // Animation controls (optional)
        const banner = document.querySelector('.banner-container');
        
        // Restart animation on click (optional)
        banner.addEventListener('click', () => {
            const elements = banner.querySelectorAll('.element');
            elements.forEach(el => {
                el.style.animation = 'none';
                el.offsetHeight; // Trigger reflow
                el.style.animation = null;
            });
        });
        
        // Auto-start animation after load
        window.addEventListener('load', () => {
            const elements = banner.querySelectorAll('.element');
            elements.forEach(el => {
                el.style.animationPlayState = 'running';
            });
        });
    </script>
</body>
</html>`;
}

export async function exportAnimatedHTMLZip(
  data: ExportData,
  opts: AnimatedZipOptions = {}
) {
  const { elements, timeline, preset } = data;
  const { sx, sy, w, h } = getScale(preset);

  const zip = new JSZip();
  const assets = zip.folder('assets')!;
  const filenameBase = (opts.filenameBase || 'animated').replace(/\s+/g, '_');

  // Deduplicate any image-like source into /assets and map -> relative path
  const srcMap = new Map<string, string>(); // original src -> "assets/name.ext"

  const addBlob = (blob: Blob, name: string, mime?: string) => {
    const ext = mime ? mimeToExt(mime) : mimeToExt(blob.type || 'image/png');
    const file = `${name}.${ext}`;
    assets.file(file, blob);
    return `assets/${file}`;
  };

  const fetchAsBlob = async (url: string) => {
    const res = await fetch(url); // requires CORS-allowed images; data URLs never hit network
    if (!res.ok) throw new Error(`Failed to fetch asset: ${url}`);
    return await res.blob();
  };

  const resolveImageSrc = async (src: string, name: string) => {
    if (!src) return '';
    if (srcMap.has(src)) return srcMap.get(src)!;

    if (isDataURL(src)) {
      const { blob, ext } = dataURLtoBlob(src);
      const file = `assets/${name}.${ext}`;
      assets.file(`${name}.${ext}`, blob);
      srcMap.set(src, file);
      return file;
    }

    // http(s) or blob:
    try {
      const blob = await fetchAsBlob(src);
      const file = addBlob(blob, name, blob.type);
      srcMap.set(src, file);
      return file;
    } catch (e) {
      console.warn('Could not collect asset', src, e);
      return src; // fallback (may break offline)
    }
  };

  // Pre-collect image sources (element images + button bg images)
  const collectedElements = await Promise.all(
    elements.map(async (el) => {
      if (el.type === 'image') {
        const img = el as ImageEl;
        const mapped = await resolveImageSrc(img.src, `img_${img.id}`);
        return { ...el, src: mapped };
      }
      if (el.type === 'button') {
        const btn = el as ButtonEl;
        if (btn.bgType === 'image' && btn.bgImageSrc) {
          const mapped = await resolveImageSrc(btn.bgImageSrc, `btnbg_${btn.id}`);
          return { ...el, bgImageSrc: mapped };
        }
      }
      return el;
    })
  );

  // ---------- helpers copied/adapted from string-based animated exporter ----------
  const generateCSSAnimations = () => {
    let css = '';

    timeline.tracks.forEach((track) => {
      const element = collectedElements.find((e) => e.id === track.elementId);
      if (!element || track.keyframes.length === 0) return;

      const propertiesMap = new Map<string, any[]>();
      track.keyframes.forEach((kf) => {
        if (!propertiesMap.has(kf.property)) propertiesMap.set(kf.property, []);
        propertiesMap.get(kf.property)!.push(kf);
      });

      propertiesMap.forEach((keyframes, property) => {
        if (keyframes.length === 0) return;
        keyframes.sort((a, b) => a.time - b.time);

        const animationName = `${element.id}-${property}`;
        css += `@keyframes ${animationName} {\n`;
        keyframes.forEach((kf) => {
          const pct = (kf.time / timeline.duration) * 100;
          let cssValue = '';

          if (property === 'position') {
            const pos = kf.value as { x: number; y: number };
            cssValue = `transform: translate(${pos.x}px, ${pos.y}px) rotate(${(element as any).rotation || 0}deg);`;
          } else if (property === 'opacity') {
            cssValue = `opacity: ${kf.value};`;
          } else if (property === 'rotation') {
            cssValue = `transform: translate(${(element as any).x}px, ${(element as any).y}px) rotate(${kf.value}deg);`;
          } else if (property === 'width' || property === 'height') {
            cssValue = `${property}: ${kf.value}px;`;
          }

          css += `  ${pct.toFixed(2)}% { ${cssValue} }\n`;
        });
        css += `}\n\n`;
      });
    });

    return css;
  };

  const generateElementCSS = () => {
    let css = '';

    collectedElements.forEach((element) => {
      const track = timeline.tracks.find((t) => t.elementId === element.id);
      const hasAnimations = !!track && track.keyframes.length > 0;

      css += `#${element.id} {\n`;
      css += `  position: absolute;\n`;
      css += `  left: ${element.x * sx}px;\n`;
      css += `  top: ${element.y * sy}px;\n`;
      css += `  width: ${element.width * sx}px;\n`;
      css += `  height: ${element.height * sy}px;\n`;
      css += `  opacity: ${element.opacity || 1};\n`;
      if ((element as any).rotation) css += `  transform: rotate(${(element as any).rotation}deg);\n`;

      if (element.type === 'text') {
        const t = element as TextEl;
        css += `  font-size: ${t.fontSize}px;\n`;
        css += `  color: ${t.fill || '#000'};\n`;
        css += `  font-family: ${t.fontFamily || 'Arial, sans-serif'};\n`;
        css += `  display: flex; align-items: center; justify-content: center;\n`;
        css += `  white-space: pre-wrap;\n`;
      } else if (element.type === 'image') {
        const i = element as ImageEl;
        css += `  object-fit: ${i.imageFit || 'cover'};\n`;
        css += `  display: block;\n`;
      } else if (element.type === 'button') {
        const b = element as ButtonEl;
        css += `  background-color: ${b.fill || '#2563eb'};\n`;
        css += `  color: ${b.textColor || '#fff'};\n`;
        css += `  border: none; border-radius: 4px; cursor: pointer;\n`;
        css += `  display: flex; align-items: center; justify-content: center; font-weight: 600;\n`;
        if (b.bgType === 'image' && b.bgImageSrc) {
          css += `  background-image: url('./${b.bgImageSrc}');\n`;
          css += `  background-size: ${b.imageFit || 'cover'};\n`;
          css += `  background-position: center; background-repeat: no-repeat;\n`;
        }
      }

      if (hasAnimations) {
        const animationNames: string[] = [];
        const propertiesMap = new Map<string, any[]>();
        track!.keyframes.forEach((kf) => {
          if (!propertiesMap.has(kf.property)) {
            propertiesMap.set(kf.property, []);
            animationNames.push(`${element.id}-${kf.property}`);
          }
        });

        if (animationNames.length > 0) {
          css += `  animation: ${animationNames.join(', ')};\n`;
          css += `  animation-duration: ${timeline.duration}s;\n`;
          css += `  animation-timing-function: ease-out;\n`;
          css += `  animation-fill-mode: both;\n`;
          if (timeline.loop) css += `  animation-iteration-count: infinite;\n`;
        }
      }

      css += `}\n\n`;
    });

    return css;
  };

  const generateHTML = () => {
    let html = '';
    collectedElements.forEach((el) => {
      if (el.type === 'text') {
        const t = el as TextEl;
        html += `    <div id="${el.id}" class="element text-element">${escapeHtml(t.text || '')}</div>\n`;
      } else if (el.type === 'image') {
        const i = el as ImageEl;
        // Use <img> with src pointing to collected asset
        html += `    <img id="${el.id}" class="element image-element" src="./${i.src}" alt="" />\n`;
      } else if (el.type === 'button') {
        const b = el as ButtonEl;
        const label = escapeHtml(b.label || 'Button');
        if (b.href) {
          html += `    <a id="${el.id}" class="element button-element" href="${escapeHtml(b.href)}" target="_blank" rel="noopener">${label}</a>\n`;
        } else {
          html += `    <button id="${el.id}" class="element button-element">${label}</button>\n`;
        }
      }
    });
    return html;
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title ?? 'Animated Banner')}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    .banner-container {
      position: relative;
      width: ${w}px;
      height: ${h}px;
      background: ${opts.backgroundColor ?? '#fff'};
      border: 1px solid #ddd;
      overflow: hidden;
      margin: 0 auto;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      cursor: pointer;
    }
    .element { position: absolute; user-select: none; }
    .button-element { text-decoration: none; transition: opacity .2s ease; }
    .button-element:hover { opacity: .9; }

    /* Generated keyframes */
${generateCSSAnimations()}

    /* Element styles */
${generateElementCSS()}
  </style>
  <script>
    ${opts.clickUrl ? `window.clickTag = ${JSON.stringify(opts.clickUrl)};` : ''}
    // Optional: open clickTag if defined
    window.addEventListener('DOMContentLoaded', () => {
      const c = document.querySelector('.banner-container');
      if (c && window.clickTag) {
        c.addEventListener('click', () => window.open(window.clickTag, '_blank'));
      }
    });
  </script>
</head>
<body>
  <div class="banner-container" role="button" aria-label="Open advertiser site">
${generateHTML()}    <span class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">Open advertiser site</span>
  </div>
  <script>
    // Restart on click (optional)
    const banner = document.querySelector('.banner-container');
    banner?.addEventListener('click', () => {
      const els = banner.querySelectorAll('.element');
      els.forEach(el => {
        (el as HTMLElement).style.animation = 'none';
        // @ts-ignore
        el.offsetHeight;
        (el as HTMLElement).style.animation = '';
      });
    });
  </script>
</body>
</html>`;

  zip.file('index.html', html);
  const out = await zip.generateAsync({ type: 'blob' });
  saveAs(out, `${filenameBase}_${w}x${h}.zip`);
}