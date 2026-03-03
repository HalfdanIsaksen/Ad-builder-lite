import { useEditorStore } from '../store/useEditorStore';
import type { AnyEl } from '../Types';
import { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColorField } from '@/components/ColorField';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Inspector() {
    const { elements, selectedId, updateElement, removeElement, replaceImageFromFile, replaceButtonBgFromFile } = useEditorStore();
    const el = useMemo<AnyEl | undefined>(() => elements.find((e) => e.id === selectedId), [elements, selectedId]);

    const fileRef = useRef<HTMLInputElement>(null);
    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && el) replaceImageFromFile(el.id, f);
        e.currentTarget.value = '';
    };

    if (!el) {
        return (
            <aside className="w-72 p-3 border-l border-border bg-background">
                <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Select an element to edit.</div>
                </Card>
            </aside>
        );
    }
    const onNum = (k: keyof AnyEl) => (e: React.ChangeEvent<HTMLInputElement>) => updateElement(el.id, { [k]: Number(e.target.value) } as any);
    const onStr = (k: keyof AnyEl) => (e: React.ChangeEvent<HTMLInputElement>) => updateElement(el.id, { [k]: e.target.value } as any);

    return (
        <aside className="w-72 p-3 border-l border-border bg-background">
            <Card className="p-3 space-y-3 h-full overflow-auto">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold capitalize">{el.type} settings</h3>
                    <Button variant="destructive" size="sm" onClick={() => removeElement(el.id)}>Delete</Button>
                </div>

            <div className="grid grid-cols-2 gap-2">
                <Label>X</Label>
                <Input type="number" value={Math.round(el.x)} onChange={onNum('x')} />
                <Label>Y</Label>
                <Input type="number" value={Math.round(el.y)} onChange={onNum('y')} />
                <Label>W</Label>
                <Input type="number" value={Math.round(el.width)} onChange={onNum('width')} />
                <Label>H</Label>
                <Input type="number" value={Math.round(el.height)} onChange={onNum('height')} />
                <Label>Opacity</Label>
                <Input type="number" min={0} max={1} step={0.05} value={el.opacity ?? 1} onChange={onNum('opacity')} />
                <Label>Rotation</Label>
                <Input type="number" value={el.rotation ?? 0} onChange={onNum('rotation')} />
            </div>
            {el.type === 'text' && (
                <div className="space-y-2">
                    <Label>Text</Label>
                    <Input value={(el as any).text} onChange={onStr('text' as any)} />
                    <Label>Font size</Label>
                    <Input type="number" value={(el as any).fontSize} onChange={onNum('fontSize' as any)} />
                    <Label>Color</Label>
                    <ColorField
                        value={(el as any).fill ?? '#111111'}
                        onChange={(value) => updateElement(el.id, { fill: value } as any)}
                    />
                </div>
            )}

            {el.type === 'image' && (
                <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input value={(el as any).src} onChange={onStr('src' as any)} />
                    <Button variant="outline" onClick={() => fileRef.current?.click()}>Replace from file…</Button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
                </div>
            )}

            {el.type === 'button' && (
                <div className="space-y-2">
                    <Label>Background</Label>
                    <Select
                        value={(el as any).bgType ?? 'solid'}
                        onValueChange={(value) => updateElement(el.id, { bgType: value as any })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                    </Select>

                    {((el as any).bgType ?? 'solid') === 'image' ? (
                        <>
                            <Label>Image URL</Label>
                            <Input
                                value={(el as any).bgImageSrc ?? ''}
                                onChange={(e) => updateElement(el.id, { bgImageSrc: e.target.value } as any)}
                            />
                            <Label>Fit</Label>
                            <Select
                                value={(el as any).imageFit ?? 'cover'}
                                onValueChange={(value) => updateElement(el.id, { imageFit: value as any })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cover">Cover</SelectItem>
                                    <SelectItem value="contain">Contain</SelectItem>
                                    <SelectItem value="stretch">Stretch</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => fileRef.current?.click()}>Upload image…</Button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) replaceButtonBgFromFile(el.id, f);
                                    (e.target as HTMLInputElement).value = '';
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <Label>Fill</Label>
                            <ColorField
                                value={(el as any).fill ?? '#2563eb'}
                                onChange={(value) => updateElement(el.id, { fill: value } as any)}
                            />
                        </>
                    )}
                    <Label>Label</Label>
                    <Input value={(el as any).label} onChange={onStr('label' as any)} />
                    <Label>Link</Label>
                    <Input value={(el as any).href ?? ''} onChange={onStr('href' as any)} />
                    <Label>Text Color</Label>
                    <ColorField
                        value={(el as any).textColor ?? '#ffffff'}
                        onChange={(value) => updateElement(el.id, { textColor: value } as any)}
                    />
                </div>
            )}

            {(el.type === 'rect' || el.type === 'circle') && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="shape-fill-toggle">Fill</Label>
                        <Checkbox
                            id="shape-fill-toggle"
                            checked={(el as any).hasFill !== false}
                            onCheckedChange={(checked) => updateElement(el.id, { hasFill: checked === true } as any)}
                        />
                    </div>

                    {(el as any).hasFill !== false && (
                        <>
                            <Label>Fill Color</Label>
                            <ColorField
                                value={(el as any).fill ?? '#2563eb'}
                                onChange={(value) => updateElement(el.id, { fill: value } as any)}
                            />
                        </>
                    )}

                    <Label>Stroke Color</Label>
                    <ColorField
                        value={(el as any).strokeColor ?? '#1e40af'}
                        onChange={(value) => updateElement(el.id, { strokeColor: value } as any)}
                    />

                    <Label>Stroke Width</Label>
                    <Input
                        type="number"
                        min={0}
                        step={1}
                        value={(el as any).strokeWidth ?? 2}
                        onChange={(e) => updateElement(el.id, { strokeWidth: Number(e.target.value) } as any)}
                    />
                </div>
            )}
            </Card>
        </aside>
    );
}