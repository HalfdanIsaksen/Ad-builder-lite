import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import CanvasStage from './components/CanvasStage';
import Inspector from './components/Inspector';
import ResponsiveBar from './components/ResponsiveBar';
import Timeline from './components/Timeline';
function App() {
  return (
    <div className="h-screen flex flex-col">
      <Topbar />
      <ResponsiveBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <CanvasStage />
          <Timeline />
        </div>
        <Inspector />
      </div>
    </div>
  );
}

export default App
