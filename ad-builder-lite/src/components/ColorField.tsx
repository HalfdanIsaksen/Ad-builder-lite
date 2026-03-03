import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isValidHexColor(value: string) {
    return HEX_COLOR_RE.test(value);
}

function toColorInputValue(value: string, fallback = '#111111') {
    if (!isValidHexColor(value)) return fallback;
    if (value.length === 4) {
        const r = value[1];
        const g = value[2];
        const b = value[3];
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    if (value.length === 9) return value.slice(0, 7);
    return value;
}

type ColorFieldProps = {
    value: string;
    onChange: (value: string) => void;
};

export function ColorField({ value, onChange }: ColorFieldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draft, setDraft] = useState(value);
    const [open, setOpen] = useState(false);
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        setDraft(value);
        setInvalid(false);
    }, [value]);

    useEffect(() => {
        const onDocMouseDown = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    const pickerValue = useMemo(() => toColorInputValue(draft, toColorInputValue(value)), [draft, value]);

    const commit = (nextRaw: string) => {
        const next = nextRaw.trim();
        if (!isValidHexColor(next)) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        onChange(next);
    };

    return (
        <div className="space-y-1" ref={containerRef}>
            <div className="relative flex items-center gap-2">
                <Input
                    value={draft}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        if (invalid) setInvalid(false);
                    }}
                    onBlur={() => commit(draft)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commit(draft);
                        }
                        if (e.key === 'Escape') {
                            setDraft(value);
                            setInvalid(false);
                            setOpen(false);
                        }
                    }}
                    aria-invalid={invalid}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label="Open color picker"
                >
                    <Palette />
                </Button>

                {open && (
                    <div className="absolute right-0 top-10 z-20 rounded-md border border-border bg-background p-2 shadow-xs">
                        <input
                            type="color"
                            className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
                            value={pickerValue}
                            onChange={(e) => {
                                const next = e.target.value;
                                setDraft(next);
                                setInvalid(false);
                                onChange(next);
                            }}
                        />
                    </div>
                )}
            </div>
            {invalid && <p className="text-xs text-destructive">Use a valid hex color: #RGB, #RRGGBB, or #RRGGBBAA.</p>}
        </div>
    );
}
