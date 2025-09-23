import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyEl, CanvasPreset, ElementType } from '../Types';
import { fileToDataURL } from '../utils/files';

function uid() { return Math.random().toString(36).slice(2, 9); }

type State = {
    elements: AnyEl[];
    selectedId: string | null;
    preset: CanvasPreset;
};

type Actions = {
    setPreset: (p: CanvasPreset) => void;
    addElement: (type: ElementType, init?: Partial<AnyEl>) => void;
    addImageFromFile: (file: File) => Promise<void>;
    replaceImageFromFile: (id: string, file: File) => Promise<void>;
    updateElement: (id: string, patch: Partial<AnyEl>) => void;
    removeElement: (id: string) => void;
    select: (id: string | null) => void;
    clear: () => void;
    importJSON: (data: AnyEl[]) => void;
};

export const useEditorStore = create<State & Actions>()(
    persist(
        (set, get) => ({
            elements: [],
            selectedId: null,
            preset: 'desktop',

            setPreset: (p) => set({ preset: p }),

            addElement: (type, init) => set((s) => {
                const common = { id: uid(), x: 40, y: 40, width: 200, height: 60, rotation: 0, opacity: 1, visible: true };
                let el: AnyEl;
                if (type === 'text') {
                    el = { ...common, type: 'text', text: 'New text', fontSize: 28, fill: '#111' } as AnyEl;
                } else if (type === 'image') {
                    el = { ...common, type: 'image', src: 'https://picsum.photos/400/240' } as AnyEl;
                } else {
                    el = { ...common, type: 'button', label: 'Click me', fill: '#2563eb', textColor: '#fff', width: 160, height: 48 } as AnyEl;
                }
                return { elements: [...s.elements, { ...el, ...(init as any) }], selectedId: (el as AnyEl).id };
            }),
            addImageFromFile: async (file) => {
                const dataUrl = await fileToDataURL(file);
                const img = new Image();
                const id = uid();
                img.onload = () => {
                    const w = Math.min(img.naturalWidth, 400);
                    const scale = w / img.naturalWidth;
                    const h = img.naturalHeight * scale;
                    set((s) => ({
                        elements: [
                            ...s.elements,
                            { id, type: 'image', x: 40, y: 40, width: w, height: h, src: dataUrl, opacity: 1, visible: true } as any,
                        ],
                        selectedId: id,
                    }));
                };
                img.src = dataUrl;
            },

            replaceImageFromFile: async (id, file) => {
                const dataUrl = await fileToDataURL(file);
                set((s) => ({ elements: s.elements.map((e) => (e.id === id ? { ...e, src: dataUrl } : e)) }));
            },

            updateElement: (id, patch) => set((s) => ({
                elements: s.elements.map((e) => (e.id === id ? { ...e, ...(patch as any) } : e)),
            })),

            removeElement: (id) => set((s) => ({ elements: s.elements.filter((e) => e.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),

            select: (id) => set({ selectedId: id }),

            clear: () => set({ elements: [], selectedId: null }),

            importJSON: (data) => set({ elements: data, selectedId: null }),
        }),
        { name: 'adbuilder-lite' }
    )
);