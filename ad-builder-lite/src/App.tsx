import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import CanvasStage from './components/CanvasStage';
import Inspector from './components/Inspector';
import Timeline from './components/Timeline';
import { Separator } from '@/components/ui/separator';
function App() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Topbar />
      <Separator />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <CanvasStage />
          <Separator />
          <Timeline />
        </div>
        <Inspector />
      </div>
    </div>
  );
}

export default App
