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

export type ImageEl = {
  type: 'image';
  id: string;
  x: number; y: number;
  width: number; height: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  src: string;
  imageFit?: 'cover' | 'contain' | 'stretch'; 
  naturalW?: number;                           
  naturalH?: number;                           
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

export type RectEl = BaseEl & {
    type: 'rect';
    fill?: string;
};

export type CircleEl = {
    type: 'circle';
    id: string;
    x: number; y: number;
    radius: number;
    rotation?: number;
    opacity?: number;
    visible?: boolean;
    fill?: string;
}
export type AnyEl = TextEl | ImageEl | ButtonEl;

export type CanvasPreset = 'desktop' | 'tablet' | 'mobile';

// Animation types
export type EasingType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';

export type AnimationProperty = 'position' | 'width' | 'height' | 'rotation' | 'opacity' | 'scale';

export type Keyframe = {
  id: string;
  time: number; // in seconds
  elementId: string;
  property: AnimationProperty;
  value: number | { x: number; y: number }; // value can be a number or an object for position
  easing?: EasingType;
};

export type AnimationTrack = {
  id: string;
  elementId: string;
  keyframes: Keyframe[];
  visible: boolean;
  locked: boolean;
  expanded: boolean; // For collapsible property tracks
};

export type TimelineState = {
  currentTime: number; // in seconds
  duration: number; // total timeline duration in seconds
  isPlaying: boolean;
  playbackSpeed: number; // 1.0 = normal speed
  loop: boolean;
  tracks: AnimationTrack[];
};


//tool bar types
export type Tool = 'select' | 'draw-text' | 'zoom';

