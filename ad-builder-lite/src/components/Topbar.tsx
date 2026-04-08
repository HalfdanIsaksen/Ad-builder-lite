import { useRef, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { useAuth } from '../auth/AuthProvider';
import ExportStage from './ExportStage';
import ImportStage from './ImportStage';
import AuthModal from './AuthModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CanvasPreset } from '../Types';

const sizes: Record<CanvasPreset, { label: string }> = {
  desktop: { label: 'Desktop' },
  tablet: { label: 'Tablet' },
  mobile: { label: 'Mobile' },
};

export default function Topbar() {
  const { elements, clear, addImageFromFile } = useEditorStore();
  const preset = useEditorStore((s) => s.preset); // desktop/tablet/mobile
  const setPreset = useEditorStore((s) => s.setPreset);
  const { user, logout, loading } = useAuth();

  const fileRef = useRef<HTMLInputElement>(null);
  const openFile = () => fileRef.current?.click();
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) addImageFromFile(f);
    e.currentTarget.value = '';
  };

  const [isExportOpen, setExportOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  return (
    <>
      <Card className="rounded-none border-0 shadow-none p-0">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-brand-500" />
              <h1 className="text-sm font-semibold">Ad Builder Lite</h1>
            </div>
            <div className="flex items-center gap-2">
              {(Object.keys(sizes) as CanvasPreset[]).map((k) => (
                <Button key={k} variant={preset === k ? 'default' : 'outline'} onClick={() => setPreset(k)}>
                  {sizes[k].label}
                </Button>
              ))}
            </div>
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

            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import Template
            </Button>

            {/* Unified Export button -> opens modal */}
            <Button onClick={() => setExportOpen(true)}>
              Export
            </Button>

            {/* Auth buttons */}
            {!loading && (
              user ? (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-muted-foreground">{user.username ?? user.email}</span>
                  <Button variant="outline" size="sm" onClick={() => logout()}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="outline" onClick={() => { setAuthTab('login'); setAuthOpen(true); }}>
                    Login
                  </Button>
                  <Button onClick={() => { setAuthTab('signup'); setAuthOpen(true); }}>
                    Sign Up
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </Card>

      <ImportStage
        open={isImportOpen}
        onClose={() => setImportOpen(false)}
        preset={preset}
      />

      {/* Export modal */}
      <ExportStage
        open={isExportOpen}
        onClose={() => setExportOpen(false)}
        elements={elements}
        preset={preset}
      />

      {/* Auth modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultTab={authTab}
      />
    </>
  );
}
