import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Transformer, Rect } from 'react-konva';
import { useEditorStore } from '../store/useEditorStore';
import { useCanvasSize } from './ResponsiveBar';
import Draggable from './Draggable';
import { getAnimatedElement } from '../utils/animation'; // Import the animation utility

export default function CanvasStage() {
  const {
    elements,
    select,
    selectedId,
    addImageFromFile,
    setTool,
    currentTool,
    addElement,
    timeline, // Add timeline to the destructuring
    zoom,
    setZoom,
    resetZoom,
    zoomToFit
  } = useEditorStore();

  const size = useCanvasSize();
  const stageRef = useRef<any>(null);

  // 1) Choose a canonical "design" space (keep your data in these units)
  const DESIGN = { w: 970, h: 250 };

  // 2) Compute scale from design -> current preset
  const sx = size.w / DESIGN.w;
  const sy = size.h / DESIGN.h;

  const transformerRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files[0]) await addImageFromFile(files[0]);
  };

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    tr.nodes(selectedNode ? [selectedNode] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedNode, selectedId, elements]);

  const selectedEl = useMemo(
    () => elements.find((e) => e.id === selectedId),
    [elements, selectedId]
  );

  const boundBoxFunc = useMemo(() => {
    const MIN = 10;

    // Lock ratio for images unless 'stretch'
    if (selectedEl && selectedEl.type === 'image' && (selectedEl as any).imageFit !== 'stretch') {
      const ar = (selectedEl.height || 1) / (selectedEl.width || 1);
      return (oldBox: any, newBox: any) => {
        if (newBox.width < MIN || newBox.height < MIN) return oldBox;
        const width = Math.max(MIN, newBox.width);
        const height = Math.max(MIN, width * ar);
        return { ...newBox, width, height };
      };
    }

    // default (texts/buttons/others)
    return (oldBox: any, newBox: any) => {
      if (newBox.width < MIN || newBox.height < MIN) return oldBox;
      return newBox;
    };
  }, [selectedEl]);

  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();

    // Check if we clicked on the stage (not on an element)
    if (e.target === stage) {
      if (currentTool === 'select') {
        // Deselect current element
        select(null);
        setSelectedNode(null);
      } else if (currentTool === 'draw-text') {
        // Get click position and account for scaling
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

        // Convert screen coordinates to design space coordinates
        const designX = pointerPosition.x / sx;
        const designY = pointerPosition.y / sy;

        // Add text element at click position
        addElement('text', {
          x: designX - 50, // Center the text
          y: designY - 10
        });
        setTool('select');
      } else if (currentTool === 'zoom') {
        // Zoom in on click location
        const newScale = zoom.scale * 1.5;
        const newX = zoom.x - (pointerPosition.x - zoom.x) * 0.5;
        const newY = zoom.y - (pointerPosition.y - zoom.y) * 0.5;
        setZoom(newScale, newX, newY);
      }
    }
  };
  // Handle wheel zoom
  const handleWheel = useCallback((e: any) => {
    if (currentTool !== 'zoom') return;

    e.evt.preventDefault();

    const stage = e.target.getStage();
    const oldScale = zoom.scale;
    const pointer = stage.getPointerPosition();

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    const newX = zoom.x - (pointer.x - zoom.x) * ((newScale / oldScale) - 1);
    const newY = zoom.y - (pointer.y - zoom.y) * ((newScale / oldScale) - 1);

    setZoom(newScale, newX, newY);
  }, [currentTool, zoom, setZoom]);

  // Handle pan when zoom tool is active
  const handleMouseDown = useCallback((e: any) => {
    if (currentTool === 'zoom' && e.target === e.target.getStage()) {
      setIsDragging(true);
      const pos = e.target.getStage().getPointerPosition();
      setLastPointerPosition(pos);
    }
  }, [currentTool]);

  const handleMouseMove = useCallback((e: any) => {
    if (!isDragging || currentTool !== 'zoom') return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    const newX = zoom.x + (pos.x - lastPointerPosition.x);
    const newY = zoom.y + (pos.y - lastPointerPosition.y);

    setZoom(zoom.scale, newX, newY);
    setLastPointerPosition(pos);
  }, [isDragging, currentTool, zoom, lastPointerPosition, setZoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);


  const handleElementClick = (elementId: string) => {
    if (currentTool === 'select') {
      select(elementId);
    }
    // Other tools can be implemented here later
  };
  
    // Keyboard shortcuts for zoom If the other works add this
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentTool === 'zoom') {
        if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          resetZoom();
        } else if (e.key === '+' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setZoom(zoom.scale * 1.2, zoom.x, zoom.y);
        } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setZoom(zoom.scale / 1.2, zoom.x, zoom.y);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTool, zoom, setZoom, resetZoom]);
  
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100" onDragOver={onDragOver} onDrop={onDrop}>
      {/* Outer frame uses the preset's pixel size */}
      <div 
        className="border border-neutral-300 bg-white shadow-sm overflow-hidden"
        style={{ width: size.w, height: size.h }}
      >
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{ cursor: currentTool === 'zoom' ? 'zoom-in' : 'default' }}
        >
          <Layer>
            {/* Root group scales design space -> preset space and applies zoom */}
            <Group 
              x={zoom.x} 
              y={zoom.y} 
              scaleX={sx * zoom.scale} 
              scaleY={sy * zoom.scale}
            >
              {/* Canvas background in design space */}
              <Rect
                x={0}
                y={0}
                width={DESIGN.w}
                height={DESIGN.h}
                fill="white"
                stroke="#ddd"
                strokeWidth={1 / zoom.scale} // Keep stroke width consistent
                listening={false} // Don't interfere with clicks
              />

              {/* Render elements */}
              {elements.map((element) => {
                // Apply animation if timeline is playing or scrubbing
                const animatedElement = timeline.isPlaying 
                  ? element // Let Konva handle animations during playback
                  : getAnimatedElement(element, timeline.currentTime, timeline.tracks);

                return (
                  <Draggable
                    key={element.id}
                    el={animatedElement}
                    onAttachNode={(node) => {
                      if (node && selectedId === element.id) {
                        setSelectedNode(node);
                      }
                    }}
                    disabled={currentTool !== 'select'}
                  />
                );
              })}
            </Group>

            {/* Transformer for selected element - outside the scaled group */}
            {selectedId && currentTool === 'select' && !timeline.isPlaying && (
              <Transformer
                ref={transformerRef}
                enabledAnchors={[
                  'top-left', 'top-center', 'top-right',
                  'middle-left', 'middle-right',
                  'bottom-left', 'bottom-center', 'bottom-right'
                ]}
                rotateEnabled
                flipEnabled={false}
                boundBoxFunc={boundBoxFunc}
                anchorSize={8}
                padding={4}
                anchorStroke="#4285f4"
                anchorFill="white"
                anchorStrokeWidth={2}
              />
            )}
          </Layer>
        </Stage>
      </div>
      {/* Should do something about this, either be the first element or maybe a dedicated area to this info */}
      {/* Tool indicator and zoom controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm flex items-center gap-3">
        <span>
          Current tool: <span className="font-medium capitalize">{currentTool?.replace('-', ' ') || 'none'}</span>
        </span>
        
        {currentTool === 'zoom' && (
          <>
            <span className="text-gray-300">|</span>
            <span>Zoom: {Math.round(zoom.scale * 100)}%</span>
            <button 
              onClick={resetZoom}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded text-xs"
            >
              Reset
            </button>
          </>
        )}
      </div>

      {/* Zoom tool instructions 
      {currentTool === 'zoom' && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded text-sm">
          <div className="font-medium mb-1">Zoom Tool</div>
          <div className="text-xs space-y-1">
            <div>• Click to zoom in</div>
            <div>• Scroll wheel to zoom</div>
            <div>• Drag to pan</div>
            <div>• Ctrl+0 to reset zoom</div>
          </div>
        </div>
      )}*/}
    </div>
  );
}