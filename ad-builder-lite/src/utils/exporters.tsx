import type { AnyEl } from '../Types';
import { useEditorStore } from '../store/useEditorStore';

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
        } catch (e) {
            alert('Invalid JSON file');
        }
    };
    input.click();
}