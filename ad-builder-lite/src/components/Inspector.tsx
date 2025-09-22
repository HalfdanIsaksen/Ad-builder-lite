import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl } from '../Types';
import { useMemo } from 'react';

const onNum = (k: keyof AnyEl) => (e: React.ChangeEvent<HTMLInputElement>) => updateElement(el.id, { [k]: Number(e.target.value) } as any);
const onStr = (k: keyof AnyEl) => (e: React.ChangeEvent<HTMLInputElement>) => updateElement(el.id, { [k]: e.target.value } as any);

return (
<aside className="w-72 p-3 border-l border-neutral-200 bg-white space-y-3">
<div className="flex items-center justify-between">
<h3 className="text-sm font-semibold capitalize">{el.type} settings</h3>
<button className="btn" onClick={() => removeElement(el.id)}>Delete</button>
</div>

<div className="grid grid-cols-2 gap-2">
<label className="label">X</label>
<input className="input" type="number" value={Math.round(el.x)} onChange={onNum('x')} />
<label className="label">Y</label>
<input className="input" type="number" value={Math.round(el.y)} onChange={onNum('y')} />
<label className="label">W</label>
<input className="input" type="number" value={Math.round(el.width)} onChange={onNum('width')} />
<label className="label">H</label>
<input className="input" type="number" value={Math.round(el.height)} onChange={onNum('height')} />
<label className="label">Opacity</label>
<input className="input" type="number" min={0} max={1} step={0.05} value={el.opacity ?? 1} onChange={onNum('opacity')} />
<label className="label">Rotation</label>
<input className="input" type="number" value={el.rotation ?? 0} onChange={onNum('rotation')} />
</div>

{el.type === 'text' && (
<div className="space-y-2">
<label className="label">Text</label>
<input className="input" value={(el as any).text} onChange={onStr('text')} />
<label className="label">Font size</label>
<input className="input" type="number" value={(el as any).fontSize} onChange={onNum('fontSize' as any)} />
<label className="label">Color</label>
<input className="input" value={(el as any).fill ?? '#111'} onChange={onStr('fill' as any)} />
</div>
)}

{el.type === 'image' && (
<div className="space-y-2">
<label className="label">Image URL</label>
<input className="input" value={(el as any).src} onChange={onStr('src' as any)} />
</div>
)}

{el.type === 'button' && (
<div className="space-y-2">
<label className="label">Label</label>
<input className="input" value={(el as any).label} onChange={onStr('label' as any)} />
<label className="label">Link</label>
<input className="input" value={(el as any).href ?? ''} onChange={onStr('href' as any)} />
<label className="label">Fill</label>
<input className="input" value={(el as any).fill ?? '#2563eb'} onChange={onStr('fill' as any)} />
<label className="label">Text Color</label>
<input className="input" value={(el as any).textColor ?? '#fff'} onChange={onStr('textColor' as any)} />
</div>
)}
</aside>
);
}