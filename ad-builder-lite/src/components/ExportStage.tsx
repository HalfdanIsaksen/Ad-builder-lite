import { exportHTML5Banner, exportJSON } from "../utils/exporters";
export default function ExportStage() {
    return (
        <div>
            <h2>Export Stage</h2>
            <button onClick={exportHTML5Banner}>Export HTML5 Banner</button>
            <button onClick={exportJSON}>Export JSON</button>
        </div>
    );
}