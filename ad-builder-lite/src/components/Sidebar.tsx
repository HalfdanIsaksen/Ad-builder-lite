import { useEditorStore } from '../store/useEditorStore';
import { MousePointer2, Type, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Sidebar() {
    const { addElement, currentTool, setTool, resetZoom } = useEditorStore();
    
    return (
        <aside className="p-3 border-r border-border bg-background w-56">
            <Card className="p-3 space-y-3 h-full rounded-xl">
            {/* Tools Section */}
            <div>
                <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Tools</h2>
                <div className="grid gap-2">
                    <Button
                        variant={currentTool === 'select' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setTool('select')}
                    >
                        <MousePointer2 className="mr-2 h-4 w-4" /> Select
                    </Button>
                    <Button
                        variant={currentTool === 'draw-text' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setTool('draw-text')}
                    >
                        <Type className="mr-2 h-4 w-4" /> Text Tool
                    </Button>
                    <Button
                        variant={currentTool === 'zoom' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setTool('zoom')}
                    >
                        <Search className="mr-2 h-4 w-4" /> Zoom
                    </Button>
                    
                    {/* Zoom controls - only show when zoom tool is active */}
                    {currentTool === 'zoom' && (
                        <Button
                            variant="secondary"
                            className="justify-start"
                            onClick={resetZoom}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset Zoom
                        </Button>
                    )}
                </div>
            </div>

            <Separator />

            {/* Components Section */}
            <div>
                <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Components</h2>
                <div className="grid gap-2">
                    <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                            addElement('text');
                            setTool('select'); 
                        }}
                    >
                        Text
                    </Button>
                    <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                            addElement('image');
                            setTool('select'); 
                        }}
                    >
                        Image
                    </Button>
                    <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                            addElement('button');
                            setTool('select'); 
                        }}
                    >
                        Button
                    </Button>
                </div>
            </div>
            </Card>
        </aside>
    );
}