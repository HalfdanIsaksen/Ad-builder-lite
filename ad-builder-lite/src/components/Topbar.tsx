import { useRef, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { importJSONDialog } from '../utils/exporters';
import ExportStage from './ExportStage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Topbar() {
  const { elements, clear, addImageFromFile } = useEditorStore();
  const preset = useEditorStore((s) => s.preset); // desktop/tablet/mobile

  const fileRef = useRef<HTMLInputElement>(null);
  const openFile = () => fileRef.current?.click();
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) addImageFromFile(f);
    e.currentTarget.value = '';
  };

  const [isExportOpen, setExportOpen] = useState(false);

  return (
    <>
      <Card className="rounded-none border-0 shadow-none p-0">
        <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-brand-500" />
          <h1 className="text-sm font-semibold">Ad Builder Lite</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => clear()}>New</Button>

          <Button variant="outline" onClick={openFile}>Upload Image</Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />

          <Button variant="outline" onClick={() => importJSONDialog()}>
            Import Template
          </Button>

          {/* Unified Export button -> opens modal */}
          <Button onClick={() => setExportOpen(true)}>
            Export
          </Button>
        </div>
        </div>
      </Card>

      {/* Export modal */}
      <ExportStage
        open={isExportOpen}
        onClose={() => setExportOpen(false)}
        elements={elements}
        preset={preset}
      />
    </>
  );
}
