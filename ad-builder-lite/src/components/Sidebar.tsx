import { useEditorStore } from '../store/useEditorStore';

export default function Sidebar() {
    const add = useEditorStore((s) => s.addElement);
    return (
        <aside className="p-3 border-r border-neutral-200 bg-white w-56 space-y-3">
            <h2 className="text-xs uppercase tracking-wide text-neutral-500">Components</h2>
            <div className="grid gap-2">
                <button className="btn" onClick={() => add('text')}>Text</button>
                <button className="btn" onClick={() => add('image')}>Image</button>
                <button className="btn" onClick={() => add('button')}>Button</button>
                {/*<button className="btn" onClick={}>+ select</button>*/}
                <select className="input h-9">
                    <option value="stretch">Rectangle</option>
                    <option value="stretch">Circle</option>
                    <option value="stretch">Ellipse</option>
                    <option value="stretch">Polygon</option>
                    <option value="stretch">Star</option>
                </select>
            </div>
        </aside>
    );
}