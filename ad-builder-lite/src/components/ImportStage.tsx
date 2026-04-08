import { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasPreset } from '../Types';
import { listTemplates, type TemplateRow } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useEditorStore } from '../store/useEditorStore';
import { parseImportedTemplateText, normalizeImportedTemplate, type ParsedTemplateImport } from '../utils/exporters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ImportStageProps = {
  open: boolean;
  onClose: () => void;
  preset: CanvasPreset;
};

type TabKey = 'local' | 'cloud';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown update time';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function SummaryCard({
  parsed,
  currentPreset,
  label,
}: {
  parsed: ParsedTemplateImport;
  currentPreset: CanvasPreset;
  label: string;
}) {
  const resolvedPreset = parsed.data.preset ?? currentPreset;

  return (
    <Card className="p-3 text-xs space-y-1">
      <div className="font-medium">{label}</div>
      <div>Format: {parsed.isLegacy ? 'Legacy element JSON' : 'Full template payload'}</div>
      <div>Elements: {parsed.elementCount}</div>
      <div>Timeline tracks: {parsed.trackCount}</div>
      <div>
        Preset after import:{' '}
        <span className="font-mono">{resolvedPreset}</span>
        {parsed.isLegacy ? ' (current preset retained)' : ''}
      </div>
    </Card>
  );
}

export default function ImportStage({ open, onClose, preset }: ImportStageProps) {
  const { user, loading: authLoading } = useAuth();
  const importJSON = useEditorStore((state) => state.importJSON);

  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabKey>('local');
  const [confirmTab, setConfirmTab] = useState<TabKey | null>(null);
  const [isBusy, setBusy] = useState(false);

  const [localFileName, setLocalFileName] = useState('');
  const [localParsed, setLocalParsed] = useState<ParsedTemplateImport | null>(null);
  const [localError, setLocalError] = useState('');

  const [cloudTemplates, setCloudTemplates] = useState<TemplateRow[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ParsedTemplateImport | null>(null);

  const resetState = () => {
    setTab('local');
    setConfirmTab(null);
    setBusy(false);
    setLocalFileName('');
    setLocalParsed(null);
    setLocalError('');
    setCloudTemplates([]);
    setCloudLoading(false);
    setCloudLoaded(false);
    setCloudError('');
    setSelectedTemplateId('');
    setSelectedTemplate(null);
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const loadCloudTemplates = async () => {
    setCloudLoading(true);
    setCloudError('');

    try {
      const rows = await listTemplates();
      setCloudTemplates(rows);
      setCloudLoaded(true);
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to load cloud templates.');
      setCloudLoaded(true);
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(() => {
    if (!open || tab !== 'cloud' || authLoading || !user || cloudLoading || cloudLoaded) {
      return;
    }

    void loadCloudTemplates();
  }, [authLoading, cloudLoaded, cloudLoading, open, tab, user]);

  const onLocalPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';

    if (!file) return;

    setConfirmTab(null);
    setLocalFileName(file.name);
    setLocalParsed(null);
    setLocalError('');

    try {
      const parsed = parseImportedTemplateText(await file.text());
      setLocalParsed(parsed);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to read template file.');
    }
  };

  const onSelectCloudTemplate = (template: TemplateRow) => {
    setConfirmTab(null);
    setSelectedTemplateId(template.id);
    setCloudError('');

    try {
      const parsed = normalizeImportedTemplate(template.json);
      setSelectedTemplate(parsed);
    } catch (error) {
      setSelectedTemplate(null);
      setCloudError(error instanceof Error ? error.message : 'This template could not be opened.');
    }
  };

  const activeParsed = tab === 'local' ? localParsed : selectedTemplate;
  const canImport = !!activeParsed;

  const primaryLabel = useMemo(() => {
    if (isBusy) {
      return 'Importing…';
    }

    if (confirmTab === tab) {
      return tab === 'local' ? 'Confirm Local Import' : 'Confirm Cloud Import';
    }

    return tab === 'local' ? 'Import Local Template' : 'Import Cloud Template';
  }, [confirmTab, isBusy, tab]);

  const executeImport = async () => {
    if (!activeParsed) return;

    setBusy(true);

    try {
      importJSON(activeParsed.data);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      if (tab === 'local') {
        setLocalError(message);
      } else {
        setCloudError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onImportClick = async () => {
    if (!canImport || isBusy) return;

    if (confirmTab !== tab) {
      setConfirmTab(tab);
      return;
    }

    await executeImport();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => { setTab(value as TabKey); setConfirmTab(null); }} className="w-full">
          <TabsList>
            <TabsTrigger value="local">Local File</TabsTrigger>
            <TabsTrigger value="cloud">Cloud / Database</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Upload template JSON</div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  Choose File
                </Button>
                <span className="text-sm text-muted-foreground">
                  {localFileName || 'No file selected'}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onLocalPick}
              />
              <p className="text-xs text-muted-foreground">
                Supports exported element JSON and full template payloads with timeline and preset data.
              </p>
            </div>

            {localError ? (
              <Card className="p-3 text-xs text-destructive">
                {localError}
              </Card>
            ) : null}

            {localParsed ? (
              <SummaryCard parsed={localParsed} currentPreset={preset} label="Selected file" />
            ) : (
              <Card className="p-3 text-xs">
                <div className="font-medium mb-1">Local import</div>
                <div>Choose a JSON file from disk to preview what will replace the current canvas.</div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cloud" className="space-y-4 mt-4">
            {authLoading ? (
              <Card className="p-3 text-xs">
                Checking account access…
              </Card>
            ) : !user ? (
              <Card className="p-3 text-xs">
                <div className="font-medium mb-1">Sign in required</div>
                <div>Log in to browse templates stored in the cloud or database.</div>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Available templates</div>
                    <p className="text-xs text-muted-foreground">Select a saved template to preview it before importing.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => void loadCloudTemplates()} disabled={cloudLoading}>
                    {cloudLoading ? 'Refreshing…' : 'Refresh'}
                  </Button>
                </div>

                {cloudError ? (
                  <Card className="p-3 text-xs text-destructive">
                    {cloudError}
                  </Card>
                ) : null}

                {cloudLoading && !cloudTemplates.length ? (
                  <Card className="p-3 text-xs">Loading templates…</Card>
                ) : null}

                {!cloudLoading && cloudLoaded && !cloudTemplates.length ? (
                  <Card className="p-3 text-xs">
                    <div className="font-medium mb-1">No templates found</div>
                    <div>Templates returned by the backend will appear here when available.</div>
                  </Card>
                ) : null}

                {cloudTemplates.length ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {cloudTemplates.map((template) => {
                      const isSelected = template.id === selectedTemplateId;

                      return (
                        <button
                          key={template.id}
                          type="button"
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${isSelected ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/60'}`}
                          onClick={() => onSelectCloudTemplate(template)}
                        >
                          <div className="text-sm font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground">Updated {formatDate(template.updatedAt)}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {selectedTemplate ? (
                  <SummaryCard parsed={selectedTemplate} currentPreset={preset} label="Selected cloud template" />
                ) : null}
              </>
            )}
          </TabsContent>
        </Tabs>

        {confirmTab === tab && activeParsed ? (
          <Card className="p-3 text-xs">
            <div className="font-medium mb-1">Confirm replacement</div>
            <div>
              Importing this template will replace the current canvas contents{activeParsed.data.timeline ? ', timeline,' : ''} and may change the preset.
            </div>
          </Card>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button
            onClick={() => void onImportClick()}
            disabled={isBusy || (tab === 'cloud' && (!user || authLoading)) || !canImport}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}