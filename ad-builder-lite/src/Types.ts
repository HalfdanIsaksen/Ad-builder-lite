export type ElementType = 'text' | 'image' | 'button';

export type BaseEl = {
    id: string;
    type: ElementType;
    x: number; y: number; width: number; height: number; rotation?: number;
    opacity?: number; visible?: boolean;
};

export type TextEl = BaseEl & {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily?: string;
    fill?: string;
};

export type ImageEl = BaseEl & {
    type: 'image';
    src: string;
};

export type ButtonEl = BaseEl & {
    type: 'button';
    label: string;
    href?: string;
    fill?: string;
    textColor?: string;
    bgType?: 'solid' | 'image';
    bgImageSrc?: string;   // used when bgType === 'image'
    imageFit?: 'cover' | 'contain' | 'stretch';
};

export type AnyEl = TextEl | ImageEl | ButtonEl;

export type CanvasPreset = 'desktop' | 'tablet' | 'mobile';