import { useEditorStore } from '../store/useEditorStore';

export default function Sidebar() {
    const { addElement, currentTool, setTool, resetZoom } = useEditorStore();
    
    return (
        <aside className="p-3 border-r border-neutral-200 bg-white w-56 space-y-3">
            {/* Tools Section */}
            <div>
                <h2 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Tools</h2>
                <div className="grid gap-2">
                    <button 
                        className={`btn ${currentTool === 'select' ? 'bg-blue-500 text-white' : ''}`}
                        onClick={() => setTool('select')}
                    >
                        <span className="mr-2">↖</span> Select
                    </button>
                    <button 
                        className={`btn ${currentTool === 'draw-text' ? 'bg-blue-500 text-white' : ''}`}
                        onClick={() => setTool('draw-text')}
                    >
                        <span className="mr-2">T</span> Text Tool
                    </button>
                    <button 
                        className={`btn ${currentTool === 'zoom' ? 'bg-blue-500 text-white' : ''}`}
                        onClick={() => setTool('zoom')}
                    >
                        <span className="mr-2">🔍</span> Zoom
                    </button>
                    
                    {/* Zoom controls - only show when zoom tool is active */}
                    {currentTool === 'zoom' && (
                        <button 
                            className="btn bg-gray-100 text-sm"
                            onClick={resetZoom}
                        >
                            Reset Zoom
                        </button>
                    )}
                </div>
            </div>

            {/* Components Section */}
            <div>
                <h2 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Components</h2>
                <div className="grid gap-2">
                    <button 
                        className="btn" 
                        onClick={() => {
                            addElement('text');
                            setTool('select'); 
                        }}
                    >
                        Text
                    </button>
                    <button 
                        className="btn" 
                        onClick={() => {
                            addElement('image');
                            setTool('select'); 
                        }}
                    >
                        Image
                    </button>
                    <button 
                        className="btn" 
                        onClick={() => {
                            addElement('button');
                            setTool('select'); 
                        }}
                    >
                        Button
                    </button>
                </div>
            </div>
        </aside>
    );
}