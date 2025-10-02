import { useRef } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { exportJSON, importJSONDialog, exportHTML5Banner } from '../utils/exporters';

export default function Topbar() {
    const { elements, clear, addImageFromFile } = useEditorStore();
  const preset = useEditorStore((s) => s.preset); // desktop/tablet/mobile

  const onExportHTML5 = async () => {
    const clickUrl = window.prompt('Click-through URL (clickTag):', 'https://example.com') || 'https://example.com';
    await exportHTML5Banner(elements, preset, { clickUrl, title: 'Ad Builder Banner' });
  };


    const fileRef = useRef<HTMLInputElement>(null);
    const openFile = () => fileRef.current?.click();
    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.type.startsWith('image/')) addImageFromFile(f);
        e.currentTarget.value = '';
    };
    return (
        <div className="flex items-center justify-between p-3 border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-brand-500" />
                <h1 className="text-sm font-semibold">Ad Builder Lite</h1>
            </div>
            <div className="flex items-center gap-2">
                <button className="btn" onClick={() => clear()}>New</button>
                <button className="btn" onClick={openFile}>Upload Image</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
                <button className="btn" onClick={() => importJSONDialog()}>Import JSON</button>
                <button className="btn-primary" onClick={() => exportJSON(elements)}>Export JSON</button>
                <button className="btn-primary" onClick={onExportHTML5}>Export HTML5</button>
            </div>
        </div>
    );
}