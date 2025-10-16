import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Group, Transformer } from 'react-konva';
import { useEditorStore } from '../store/useEditorStore';
import { useCanvasSize } from './ResponsiveBar';
import Draggable from './Draggable';


export default function CanvasStage() {
  const { elements,
    select,
    selectedId,
    addImageFromFile,
    setTool,
    currentTool,
    addElement,

  } = useEditorStore();
  const size = useCanvasSize();

  // 1) Choose a canonical “design” space (keep your data in these units)
  const DESIGN = { w: 970, h: 250 }; // 👈 match your desktop preset

  // 2) Compute scale from design -> current preset
  const sx = size.w / DESIGN.w;
  const sy = size.h / DESIGN.h;

  const transformerRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

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
      } else if (currentTool === 'draw-text') {
        // Get click position
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

        // Add text element at click position
        addElement('text', {
          x: pointerPosition.x - 50, // Center the text
          y: pointerPosition.y - 10
        });
        setTool('select');
      }
    }
  };

  const handleElementClick = (elementId: string) => {
    if (currentTool === 'select') {
      select(elementId);
    }
    // implement other tools when added
  };


  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100" onDragOver={onDragOver} onDrop={onDrop}>
      {/* Outer frame uses the preset's pixel size */}
      <div className="border border-neutral-300 bg-white shadow-sm" style={{ width: size.w, height: size.h }}>
        <Stage
          width={size.w}
          height={size.h}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              select(null);
              setSelectedNode(null);
            }
          }}
          onTap={(e) => {
            if (e.target === e.target.getStage()) {
              select(null);
              setSelectedNode(null);
            }
          }}
        >
          <Layer>
            {/* Root group scales design space -> preset space */}
            <Group x={0} y={0} scaleX={sx} scaleY={sy}>
              {elements.map((el) => (
                <Draggable
                  key={el.id}
                  el={el}
                  onAttachNode={(n) => setSelectedNode(n)}

                />
              ))}
            </Group>

            {selectedId && (
              <Transformer
                ref={transformerRef}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                rotateEnabled
                flipEnabled={false}
                boundBoxFunc={boundBoxFunc}
                anchorSize={8}
                padding={4}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}