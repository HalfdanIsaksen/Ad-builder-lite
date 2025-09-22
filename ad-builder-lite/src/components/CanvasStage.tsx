import { Stage, Layer, Rect, Text, Image as KImage, Group } from 'react-konva';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl, ButtonEl, ImageEl, TextEl } from '../Types';
import { useCanvasSize } from './ResponsiveBar';
import React from 'react';

function Img({ el }: { el: ImageEl }) {
const [img] = useImage(el.src, 'anonymous');
    return <KImage image={img as any} x={el.x} y={el.y} width={el.width} height={el.height} opacity={el.opacity ?? 1} rotation={el.rotation ?? 0} />;
}

function Btn({ el }: { el: ButtonEl }) {
    //const padX = 16, padY = 10;
    return (
        <Group x={el.x} y={el.y} opacity={el.opacity ?? 1} rotation={el.rotation ?? 0}>
        <Rect width={el.width} height={el.height} fill={el.fill ?? '#2563eb'} cornerRadius={12} />
        <Text text={el.label} fill={el.textColor ?? '#fff'} align="center" verticalAlign="middle" x={0} y={0} width={el.width} height={el.height} fontStyle="600"/>
        </Group>
    );
}

function Draggable({ el }: { el: AnyEl }) {
    const selectedId = useEditorStore((s) => s.selectedId);
    const select = useEditorStore((s) => s.select);
    const update = useEditorStore((s) => s.updateElement);

    const isSelected = selectedId === el.id;

    const common = {
        draggable: true,
        onDragEnd: (e: any) => update(el.id, { x: e.target.x(), y: e.target.y() } as any),
        onClick: () => select(el.id),
        onTap: () => select(el.id),
        opacity: el.opacity ?? 1,
    } as const;

    if (el.type === 'text') {
        el = el as TextEl;
        return <Text {...common} x={el.x} y={el.y} text={el.text} fontSize={(el as TextEl).fontSize} fill={(el as TextEl).fill ?? '#111'} />;
    }
        if (el.type === 'image') return <Img el={el as any} />;
        if (el.type === 'button') return <Btn el={el as any} />;
        return null;
}

export default function CanvasStage() {
    const { elements, select } = useEditorStore();
    const size = useCanvasSize();

    return (
        <div className="flex-1 flex items-center justify-center bg-neutral-100">
            <div className="border border-neutral-300 bg-white shadow-sm" style={{ width: size.w, height: size.h }}>
                <Stage width={size.w} height={size.h} onMouseDown={(e) => { if (e.target === e.target.getStage()) select(null); }}>
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