import { Stage, Layer, Rect, Text, Image as KImage, Group } from 'react-konva';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl, ButtonEl, ImageEl, TextEl } from '../Types';
import { useCanvasSize } from './ResponsiveBar';


type EventProps = {
  draggable: boolean;
  onMouseDown: (e: any) => void;
  onTap: () => void;
  onDragEnd: (e: any) => void;
};

function Img({ el, eventProps }: { el: ImageEl; eventProps: EventProps }) {
  const [img] = useImage(el.src, 'anonymous');
  return (
    <KImage
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

function Btn({ el, eventProps }: { el: ButtonEl; eventProps: EventProps }) {
  return (
    <Group
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

function Draggable({ el }: { el: AnyEl }) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const update = useEditorStore((s) => s.updateElement);

  const eventProps: EventProps = {
    draggable: true,
    onMouseDown: () => select(el.id), // ensures click selects even if you start dragging
    onTap: () => select(el.id),
    onDragEnd: (e: any) => update(el.id, { x: e.target.x(), y: e.target.y() } as any),
  };

  if (el.type === 'text') {
    const t = el as TextEl;
    return (
      <Text
        x={t.x}
        y={t.y}
        text={t.text}
        fontSize={t.fontSize}
        fill={t.fill ?? '#111'}
        opacity={t.opacity ?? 1}
        rotation={t.rotation ?? 0}
        listening
        {...eventProps}
      />
    );
  }
  if (el.type === 'image') return <Img el={el as ImageEl} eventProps={eventProps} />;
  if (el.type === 'button') return <Btn el={el as ButtonEl} eventProps={eventProps} />;
  return null;
}

export default function CanvasStage() {
  const { elements, select } = useEditorStore();
  const size = useCanvasSize();

  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100">
      <div className="border border-neutral-300 bg-white shadow-sm" style={{ width: size.w, height: size.h }}>
        <Stage
          width={size.w}
          height={size.h}
          onMouseDown={(e) => {
            // click on empty area clears selection
            if (e.target === e.target.getStage()) select(null);
          }}
          onTap={(e) => {
            if (e.target === e.target.getStage()) select(null);
          }}
        >
          <Layer>
            {elements.map((el) => (
              <Draggable key={el.id} el={el} />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
