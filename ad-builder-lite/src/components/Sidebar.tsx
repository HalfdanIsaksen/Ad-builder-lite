import { useEditorStore } from '../store/useEditorStore';

export default function Sidebar() {
    const { addElement, currentTool, setTool } = useEditorStore();
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
                            setTool('select'); // Auto-switch to select tool after adding
                        }}
                    >
                        Text
                    </button>
                    <button 
                        className="btn" 
                        onClick={() => {
                            addElement('image');
                            setTool('select'); // Auto-switch to select tool after adding
                        }}
                    >
                        Image
                    </button>
                    <button 
                        className="btn" 
                        onClick={() => {
                            addElement('button');
                            setTool('select'); // Auto-switch to select tool after adding
                        }}
                    >
                        Button
                    </button>
                    
                    {/* Shape selector */}
                    <select className="input h-9" onChange={(e) => {
                        const shape = e.target.value;
                        // You can implement shape creation here later
                        console.log('Selected shape:', shape);
                    }}>
                        <option value="">Select Shape...</option>
                        <option value="rectangle">Rectangle</option>
                        <option value="circle">Circle</option>
                        <option value="ellipse">Ellipse</option>
                        <option value="polygon">Polygon</option>
                        <option value="star">Star</option>
                    </select>
                </div>
            </div>
        </aside>
    );
}