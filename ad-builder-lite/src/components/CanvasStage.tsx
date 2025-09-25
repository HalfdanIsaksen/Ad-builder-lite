import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Image as KImage, Group, Transformer } from 'react-konva';
//import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';
//import type { AnyEl, ButtonEl, ImageEl, TextEl } from '../Types';
import { useCanvasSize } from './ResponsiveBar';
import Draggable from './Draggable';
/*Might be useful later else delete
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
  const [bgImg] = useImage(el.bgImageSrc || '', 'anonymous');

  // rounded clip for the whole button (so image respects corner radius)
  const radius = 12;
  const clipRounded = (ctx: any) => {
    const w = el.width, h = el.height, r = Math.min(radius, Math.min(w, h) / 2);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
  };

  // compute fitted image rect inside button
  let imgX = 0, imgY = 0, imgW = el.width, imgH = el.height;
  if (bgImg && el.bgType === 'image' && bgImg.width && bgImg.height) {
    const sx = el.width / bgImg.width;
    const sy = el.height / bgImg.height;
    if (el.imageFit === 'contain') {
      const s = Math.min(sx, sy);
      imgW = bgImg.width * s;
      imgH = bgImg.height * s;
      imgX = (el.width - imgW) / 2;
      imgY = (el.height - imgH) / 2;
    } else if (el.imageFit === 'cover') {
      const s = Math.max(sx, sy);
      imgW = bgImg.width * s;
      imgH = bgImg.height * s;
      imgX = (el.width - imgW) / 2;
      imgY = (el.height - imgH) / 2;
    } else {
      // 'stretch' (default): fill rect
      imgW = el.width; imgH = el.height; imgX = 0; imgY = 0;
    }
  }

  return (
    <Group
      ref={nodeRef}
      x={el.x}
      y={el.y}
      opacity={el.opacity ?? 1}
      rotation={el.rotation ?? 0}
      listening
      clipFunc={clipRounded}
      {...eventProps}
    >
      {el.bgType === 'image' && bgImg ? (
        <KImage image={bgImg as any} x={imgX} y={imgY} width={imgW} height={imgH} />
      ) : (
        <Rect width={el.width} height={el.height} fill={el.fill ?? '#2563eb'} />
      )}
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
}*/

export default function CanvasStage() {
  const { elements, select, selectedId, addImageFromFile } = useEditorStore();
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

  const boundBoxFunc = useMemo(
    () => (oldBox: any, newBox: any) => {
      const MIN_SIZE = 10;
      return { ...newBox, width: Math.max(MIN_SIZE, newBox.width), height: Math.max(MIN_SIZE, newBox.height) };
    },
    []
  );

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
                  parentScaleX={sx}
                  parentScaleY={sy}
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