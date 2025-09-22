import { useEditorStore } from '../store/useEditorStore';
import type { CanvasPreset } from '../Types';

const sizes: Record<CanvasPreset, { w: number; h: number; label: string }> = {
desktop: { w: 970, h: 250, label: 'Desktop 970×250' },
tablet: { w: 728, h: 90, label: 'Tablet 728×90' },
mobile: { w: 320, h: 100, label: 'Mobile 320×100' },
};

export function useCanvasSize() {
const preset = useEditorStore((s) => s.preset);
return sizes[preset];
}

export default function ResponsiveBar() {
const preset = useEditorStore((s) => s.preset);
const setPreset = useEditorStore((s) => s.setPreset);
return (
<div className="flex items-center gap-2 p-2 border-b border-neutral-200 bg-white">
{ (Object.keys(sizes) as (keyof typeof sizes)[]).map((k) => (
<button key={k} className={`btn ${preset === k ? 'btn-primary' : ''}`} onClick={() => setPreset(k)}>
{sizes[k].label}
</button>
)) }
</div>
);
}