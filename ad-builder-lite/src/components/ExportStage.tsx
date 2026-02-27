import { useState } from 'react';
import type { AnyEl, CanvasPreset } from '../Types';
import { exportJSON, exportHTML5Banner, exportAnimatedHTMLZip } from '../utils/exporters';
import { useEditorStore } from '../store/useEditorStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

type ExportStageProps = {
  open: boolean;
  onClose: () => void;
  elements: AnyEl[];
  preset: CanvasPreset;
};

type TabKey = 'html5' | 'animated' | 'json';

export default function ExportStage({ open, onClose, elements, preset }: ExportStageProps) {
  const safeElements = Array.isArray(elements) ? elements : [];
  const [tab, setTab] = useState<TabKey>('html5');
  const [clickUrl, setClickUrl] = useState('https://example.com');
  const [title, setTitle] = useState('Ad Builder Banner');
  const [htmlFilename, setHtmlFilename] = useState('banner');
  const [animatedFilename, setAnimatedFilename] = useState('animated');
  const [jsonFilename, setJsonFilename] = useState('ad-builder');
  const [isBusy, setBusy] = useState(false);

  const timeline = useEditorStore((s) => s.timeline);

  const canExport =
    tab === 'html5'
      ? !!clickUrl && !!title && safeElements.length > 0
      : safeElements.length > 0;

  const doExport = async () => {
    try {
      setBusy(true);

      if (tab === 'html5') {
        await exportHTML5Banner(safeElements, preset, { clickUrl, title });
      } else if (tab === 'animated') {
        await exportAnimatedHTMLZip(
          { elements: safeElements, timeline, preset },
          { title, clickUrl, filenameBase: animatedFilename || 'animated' }
        );
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

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="w-full">
          <TabsList>
            <TabsTrigger value="html5">HTML5 Banner</TabsTrigger>
            <TabsTrigger value="animated">Animated HTML</TabsTrigger>
            <TabsTrigger value="json">Template (JSON)</TabsTrigger>
          </TabsList>

          <TabsContent value="html5" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Click-through URL (clickTag)</Label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={clickUrl}
                onChange={(e) => setClickUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Will be injected as window.clickTag.</p>
            </div>

            <div className="space-y-2">
              <Label>Banner title</Label>
              <Input
                type="text"
                placeholder="Ad Builder Banner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Filename (zip)</Label>
              <Input
                type="text"
                placeholder="banner"
                value={htmlFilename}
                onChange={(e) => setHtmlFilename(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Saved as {htmlFilename || 'banner'}_WxH.zip.</p>
            </div>

            <Card className="p-3 text-xs">
              <div className="font-medium mb-1">Current preset</div>
              <div>Exporting for: <span className="font-mono">{preset}</span></div>
            </Card>
          </TabsContent>

          <TabsContent value="animated" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Filename (.html)</Label>
              <Input
                type="text"
                placeholder="animated"
                value={animatedFilename}
                onChange={(e) => setAnimatedFilename(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Generates a single HTML file with CSS keyframes using the current timeline.
              </p>
            </div>

            <Card className="p-3 text-xs">
              <div className="font-medium mb-1">Animation summary</div>
              <ul className="list-disc pl-5">
                <li>Preset: <span className="font-mono">{preset}</span></li>
                <li>Tracks: {timeline?.tracks?.length ?? 0}</li>
                <li>Duration: {timeline?.duration ?? 0}s {timeline?.loop ? '(looping)' : ''}</li>
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Filename (.json)</Label>
              <Input
                type="text"
                placeholder="ad-builder"
                value={jsonFilename}
                onChange={(e) => setJsonFilename(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Note: the built-in JSON exporter always saves as ad.json.</p>
            </div>

            <Card className="p-3 text-xs">
              <div className="font-medium mb-1">What’s included</div>
              <ul className="list-disc pl-5">
                <li>All elements currently in the canvas</li>
                <li>Properties as defined in AnyEl</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button disabled={!canExport || isBusy} onClick={doExport}>
            {isBusy ? 'Exporting…' : tab === 'html5' ? 'Export HTML5 (zip)' : tab === 'animated' ? 'Export Animated HTML' : 'Export JSON'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
