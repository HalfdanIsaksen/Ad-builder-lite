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
  onTransformStart?: (e: any) => void;
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
      const scale = getAnimatedValue(1, 'scale', el.id, timeline.currentTime, timeline.tracks);
      node.scaleX(scale);
      node.scaleY(scale);

      node.getLayer()?.batchDraw();
    }

    return () => {
      stopElementAnimations(el.id);
    };
  }, [timeline.isPlaying, el.id, timeline.tracks, timeline.currentTime]);

  const transformStartRef = useRef<{ width: number; height: number; rotation: number } | null>(null);

  const eventProps: EventProps = {
    draggable: !timeline.isPlaying,
    onMouseDown: () => !timeline.isPlaying && select(el.id),
    onTap: () => !timeline.isPlaying && select(el.id),

    onDragEnd: (e: any) => {
      const n = e.target;
      update(el.id, {
        x: n.x(),
        y: n.y(),
      } as any);
    },

    // Track when transformation starts
    onTransformStart: () => {
      transformStartRef.current = {
        width: el.width || 0,
        height: el.height || 0,
        rotation: el.rotation || 0
      };
    },

    onTransformEnd: (e: any) => {
      const n = e.target as any;
      // read what transformer did
      let scaleX = n.scaleX();
      let scaleY = n.scaleY();
      const currentRotation = n.rotation();

      // snap near-1 scale to exactly 1 to avoid tiny cumulative errors
      const EPS = 0.001;
      if (Math.abs(scaleX - 1) < EPS) scaleX = 1;
      if (Math.abs(scaleY - 1) < EPS) scaleY = 1;

      const startData = transformStartRef.current;

      if (startData) {
        const updateData: any = {
          x: n.x(),
          y: n.y(),
          rotation: currentRotation,
        };

        // did user actually resize (not just rotate)?
        const SCALE_THRESHOLD = 0.08; // 8% feels safer than 5% for noisy rotations
        const scaleChanged =
          Math.abs(scaleX - 1) > SCALE_THRESHOLD || Math.abs(scaleY - 1) > SCALE_THRESHOLD;

        if (scaleChanged) {
          // real resize: persist new logical size
          updateData.width = Math.max(5, startData.width * scaleX);
          updateData.height = Math.max(5, startData.height * scaleY);
        } else {
          // rotation-only: explicitly restore the node’s logical size
          // so we don't “bake” any accidental scale into width/height
          n.width(startData.width);
          n.height(startData.height);
        }

        update(el.id, updateData);
      }

      // Always clear scale on the node so next transform starts fresh
      n.scaleX(1);
      n.scaleY(1);

      transformStartRef.current = null;
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
        drawW = i.width;
        drawH = i.height;
        drawX = 0;
        drawY = 0;
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
        width={i.width}
        height={i.height}
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
