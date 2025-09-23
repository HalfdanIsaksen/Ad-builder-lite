import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Image as KImage, Group, Transformer } from 'react-konva';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl, ButtonEl, ImageEl, TextEl } from '../Types';
import { useCanvasSize } from './ResponsiveBar';

type EventProps = {
  draggable: boolean;
  onMouseDown: (e: any) => void;
  onTap: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
};

function Img({ el, eventProps, nodeRef }: { el: ImageEl; eventProps: EventProps; nodeRef: any }) {
  const [img] = useImage(el.src, 'anonymous');
  return (
    <KImage
      ref={nodeRef}
      image={img as any}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      opacity={el.opacity ?? 1}
      rotation={el.rotation ?? 0}
      listening
      {...eventProps}
    />
  );
}

function Btn({ el, eventProps, nodeRef }: { el: ButtonEl; eventProps: EventProps; nodeRef: any }) {
  return (
    <Group
      ref={nodeRef}
      x={el.x}
      y={el.y}
      opacity={el.opacity ?? 1}
      rotation={el.rotation ?? 0}
      listening
      {...eventProps}
    >
      <Rect width={el.width} height={el.height} fill={el.fill ?? '#2563eb'} cornerRadius={12} />
      <Text
        text={el.label}
        fill={el.textColor ?? '#fff'}
        align="center"
        verticalAlign="middle"
        x={0}
        y={0}
        width={el.width}
        height={el.height}
        fontStyle="600"
      />
    </Group>
  );
}

function Draggable({
  el,
  onAttachNode,
}: {
  el: AnyEl;
  onAttachNode: (node: any | null) => void;
}) {
  const select = useEditorStore((s) => s.select);
  const update = useEditorStore((s) => s.updateElement);
  const isSelected = useEditorStore((s) => s.selectedId === el.id);

  const nodeRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected) onAttachNode(nodeRef.current);
  }, [isSelected, onAttachNode]);

  const eventProps: EventProps = {
    draggable: true,
    onMouseDown: () => select(el.id),
    onTap: () => select(el.id),
    onDragEnd: (e: any) => update(el.id, { x: e.target.x(), y: e.target.y() } as any),
    onTransformEnd: (e: any) => {
      const n = e.target;
      // capture scale + normalize back to 1 so width/height store real size
      const scaleX = n.scaleX();
      const scaleY = n.scaleY();
      const newW = Math.max(5, (el.width || 0) * scaleX);
      const newH = Math.max(5, (el.height || 0) * scaleY);

      // write back size/pos/rotation
      update(el.id, {
        x: n.x(),
        y: n.y(),
        width: newW,
        height: newH,
        rotation: n.rotation(),
      } as any);

      // reset runtime scale to keep transformer consistent
      n.scaleX(1);
      n.scaleY(1);
    },
  };

  if (el.type === 'text') {
    const t = el as TextEl;
    return (
      <Text
        ref={nodeRef}
        x={t.x}
        y={t.y}
        text={t.text}
        fontSize={t.fontSize}
        fill={t.fill ?? '#111'}
        opacity={t.opacity ?? 1}
        rotation={t.rotation ?? 0}
        width={t.width}
        height={t.height}
        listening
        {...eventProps}
      />
    );
  }
  if (el.type === 'image') return <Img el={el as ImageEl} eventProps={eventProps} nodeRef={nodeRef} />;
  if (el.type === 'button') return <Btn el={el as ButtonEl} eventProps={eventProps} nodeRef={nodeRef} />;

  return null;
}

export default function CanvasStage() {
  const { elements, select, selectedId, addImageFromFile } = useEditorStore();
  const size = useCanvasSize();

  const transformerRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  // drag & drop image files to add
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files[0]) await addImageFromFile(files[0]);
  };

  // Attach the selected Konva node to the Transformer
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedNode) {
      tr.nodes([selectedNode]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedNode, selectedId, elements]);

  // constrain min size and allow only corner handles
  const boundBoxFunc = useMemo(
    () => (oldBox: any, newBox: any) => {
      const MIN_SIZE = 10;
      const w = Math.max(MIN_SIZE, newBox.width);
      const h = Math.max(MIN_SIZE, newBox.height);
      return { ...newBox, width: w, height: h };
    },
    []
  );

  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100" onDragOver={onDragOver} onDrop={onDrop}>
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
            {elements.map((el) => (
              <Draggable key={el.id} el={el} onAttachNode={(n) => setSelectedNode(n)} />
            ))}

            {/* Selection transformer */}
            {selectedId && (
              <Transformer
                ref={transformerRef}
                // show only corner anchors for scaling
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                rotateEnabled={true}
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
