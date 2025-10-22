import React, { useEffect, useRef, useState, useMemo } from 'react';
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
    // Check if we clicked on the stage (not on an element)
    if (e.target === e.target.getStage()) {
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
      }else if (currentTool === 'zoom') {
        // Zoom in on click location
        const newScale = zoom.scale * 1.5;
        const newX = zoom.x - (pointerPosition.x - zoom.x) * 0.5;
        const newY = zoom.y - (pointerPosition.y - zoom.y) * 0.5;
        setZoom(newScale, newX, newY);
      }
    }
  };

  const handleElementClick = (elementId: string) => {
    if (currentTool === 'select') {
      select(elementId);
    }
    // Other tools can be implemented here later
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100" onDragOver={onDragOver} onDrop={onDrop}>
      {/* Outer frame uses the preset's pixel size */}
      <div className="border border-neutral-300 bg-white shadow-sm" style={{ width: size.w, height: size.h }}>
        <Stage
          width={size.w}
          height={size.h}
          onMouseDown={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {/* Root group scales design space -> preset space */}
            <Group x={0} y={0} scaleX={sx} scaleY={sy}>
              {/* Canvas background in design space */}
              <Rect
                x={0}
                y={0}
                width={DESIGN.w}
                height={DESIGN.h}
                fill="white"
                stroke="#ddd"
                strokeWidth={1}
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
      
      {/* Tool indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
        Current tool: <span className="font-medium capitalize">{(currentTool || 'none').replace('-', ' ')}</span>
      </div>
    </div>
  );
}