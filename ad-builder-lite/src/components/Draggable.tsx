import { useEffect, useRef } from 'react';
import { Text, Image as KImage, Group, Rect } from 'react-konva';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl, ButtonEl, ImageEl, TextEl } from '../Types';
import { getAnimatedElement, createKonvaAnimations, stopElementAnimations, getAnimatedValue } from '../utils/animation';

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
}: {
  el: AnyEl;
  onAttachNode: (node: any | null) => void;
}) {
  const select = useEditorStore((s) => s.select);
  const update = useEditorStore((s) => s.updateElement);
  const isSelected = useEditorStore((s) => s.selectedId === el.id);
  const timeline = useEditorStore((s) => s.timeline);

  // Only use manual interpolation when NOT playing (for scrubbing)
  // When playing, let Konva handle all animations
  const animatedEl = timeline.isPlaying 
    ? el  // Use base element, Konva will animate the actual node
    : getAnimatedElement(el, timeline.currentTime, timeline.tracks); // Manual interpolation for scrubbing

  const nodeRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected) onAttachNode(nodeRef.current);
  }, [isSelected, onAttachNode]);

  // Handle Konva animations when timeline state changes
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (timeline.isPlaying) {
      // Start Konva animations from current timeline position
      createKonvaAnimations(
        node, 
        el.id, 
        timeline.tracks, 
        timeline.currentTime, 
        timeline.playbackSpeed
      );
    } else {
      // Stop animations and set to current timeline position
      stopElementAnimations(el.id);
      
      // Set node to current timeline position for smooth transition
      const animatedEl = getAnimatedElement(el, timeline.currentTime, timeline.tracks);
      node.x(animatedEl.x);
      node.y(animatedEl.y);
      node.width(animatedEl.width);
      node.height(animatedEl.height);
      node.rotation(animatedEl.rotation || 0);
      node.opacity(animatedEl.opacity || 1);
      
      // Handle scale
      const scale = getAnimatedValue(el.id, 'scale', timeline.currentTime, timeline.tracks);
      node.scaleX(scale);
      node.scaleY(scale);
      
      node.getLayer()?.batchDraw();
    }

    return () => {
      stopElementAnimations(el.id);
    };
  }, [timeline.isPlaying, el.id, timeline.tracks, timeline.currentTime]);

  const eventProps: EventProps = {
    draggable: !timeline.isPlaying, // Disable dragging during animation playback
    onMouseDown: () => !timeline.isPlaying && select(el.id),
    onTap: () => !timeline.isPlaying && select(el.id),

    // IMPORTANT: positions reported are in the parent group's (scaled) space.
    onDragEnd: (e: any) => {
      const n = e.target;
      update(el.id, {
        x: n.x(),
        y: n.y(),
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
    const t = animatedEl as TextEl;
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
    const i = animatedEl as ImageEl;
    const [img] = useImage(i.src, 'anonymous');

    const frameRef = nodeRef;

    // Compute object-fit sizing each render
    let drawX = 0, drawY = 0, drawW = i.width, drawH = i.height;

    const natW = i.naturalW ?? img?.width ?? 1;
    const natH = i.naturalH ?? img?.height ?? 1;

    if (img && natW > 0 && natH > 0) {
      const sx = i.width / natW;
      const sy = i.height / natH;

      if ((i.imageFit ?? 'cover') === 'contain') {
        const s = Math.min(sx, sy);
        drawW = Math.round(natW * s);
        drawH = Math.round(natH * s);
        drawX = Math.round((i.width - drawW) / 2);
        drawY = Math.round((i.height - drawH) / 2);
      } else if ((i.imageFit ?? 'cover') === 'cover') {
        const s = Math.max(sx, sy);
        drawW = Math.round(natW * s);
        drawH = Math.round(natH * s);
        drawX = Math.round((i.width - drawW) / 2);
        drawY = Math.round((i.height - drawH) / 2);
        // parts outside the frame will be clipped by Group below
      } else {
        // 'stretch' (fill the frame regardless of aspect ratio)
        drawW = i.width;
        drawH = i.height;
        drawX = 0;
        drawY = 0;
      }
    }

    // Clip the image to the frame rect so 'cover' doesn't spill out
    const clipRect = (ctx: any) => {
      ctx.beginPath();
      ctx.rect(0, 0, i.width, i.height);
      ctx.closePath();
    };

    return (
      <Group
        ref={frameRef}
        x={i.x}
        y={i.y}
        opacity={i.opacity ?? 1}
        rotation={i.rotation ?? 0}
        clipFunc={clipRect}
        listening
        {...eventProps}
      >
        <KImage image={img as any} x={drawX} y={drawY} width={drawW} height={drawH} />
      </Group>
    );
  }



  if (el.type === 'button') {
    const b = animatedEl as ButtonEl;
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
