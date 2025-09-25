import React, { useEffect, useRef } from 'react';
import { Text, Image as KImage, Group, Rect } from 'react-konva';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl, ButtonEl, ImageEl, TextEl } from '../Types';

type EventProps = {
  draggable: boolean;
  onMouseDown: (e: any) => void;
  onTap: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
};

export default function Draggable({
  el,
  onAttachNode,
  parentScaleX,
  parentScaleY,
}: {
  el: AnyEl;
  onAttachNode: (node: any | null) => void;
  parentScaleX: number;
  parentScaleY: number;
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

    // IMPORTANT: positions reported are in the parent group's (scaled) space.
    onDragEnd: (e: any) => {
      const n = e.target;
      update(el.id, {
        x: n.x() / parentScaleX,
        y: n.y() / parentScaleY,
      } as any);
    },

    // IMPORTANT: width/height use the node's local scale; position needs unscale.
    onTransformEnd: (e: any) => {
      const n = e.target;
      const scaleX = n.scaleX();
      const scaleY = n.scaleY();

      const newW = Math.max(5, (el.width || 0) * scaleX);
      const newH = Math.max(5, (el.height || 0) * scaleY);

      update(el.id, {
        x: n.x() / parentScaleX,
        y: n.y() / parentScaleY,
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

  if (el.type === 'image') {
    const i = el as ImageEl;
    const [img] = useImage(i.src, 'anonymous');
    return (
      <KImage
        ref={nodeRef}
        image={img as any}
        x={i.x}
        y={i.y}
        width={i.width}
        height={i.height}
        opacity={i.opacity ?? 1}
        rotation={i.rotation ?? 0}
        listening
        {...eventProps}
      />
    );
  }

  if (el.type === 'button') {
    const b = el as ButtonEl;
    const [bgImg] = useImage(b.bgImageSrc || '', 'anonymous');

    const radius = 12;
    const clipRounded = (ctx: any) => {
      const w = b.width, h = b.height, r = Math.min(radius, Math.min(w, h) / 2);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(w, 0, w, h, r);
      ctx.arcTo(w, h, 0, h, r);
      ctx.arcTo(0, h, 0, 0, r);
      ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath();
    };

    // compute fitted image rect inside button (design space)
    let imgX = 0, imgY = 0, imgW = b.width, imgH = b.height;
    if (bgImg && b.bgType === 'image' && bgImg.width && bgImg.height) {
      const sx = b.width / bgImg.width;
      const sy = b.height / bgImg.height;
      if (b.imageFit === 'contain') {
        const s = Math.min(sx, sy);
        imgW = bgImg.width * s; imgH = bgImg.height * s;
        imgX = (b.width - imgW) / 2; imgY = (b.height - imgH) / 2;
      } else if (b.imageFit === 'cover') {
        const s = Math.max(sx, sy);
        imgW = bgImg.width * s; imgH = bgImg.height * s;
        imgX = (b.width - imgW) / 2; imgY = (b.height - imgH) / 2;
      } else {
        imgW = b.width; imgH = b.height; imgX = 0; imgY = 0;
      }
    }

    return (
      <Group
        ref={nodeRef}
        x={b.x}
        y={b.y}
        opacity={b.opacity ?? 1}
        rotation={b.rotation ?? 0}
        listening
        clipFunc={clipRounded}
        {...eventProps}
      >
        {b.bgType === 'image' && bgImg ? (
          <KImage image={bgImg as any} x={imgX} y={imgY} width={imgW} height={imgH} />
        ) : (
          <Rect width={b.width} height={b.height} fill={b.fill ?? '#2563eb'} />
        )}
        <Text
          text={b.label}
          fill={b.textColor ?? '#fff'}
          align="center"
          verticalAlign="middle"
          x={0}
          y={0}
          width={b.width}
          height={b.height}
          fontStyle="600"
        />
      </Group>
    );
  }

  return null;
}
