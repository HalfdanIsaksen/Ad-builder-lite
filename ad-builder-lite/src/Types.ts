//Element types

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

export type CircleEl = BaseEl & {
    type: 'circle';
    radius: number;
    fill?: string;
}

//export type AnyEl = TextEl | ImageEl | ButtonEl;
export type AnyEl = {
  id: string;
  type: 'text' | 'image' | 'button' | string;
  // ... existing fields (x, y, width, height, etc.)
  layerGroupId: LayerGroupId | null; // <— which group this element belongs to
  layerOrder: number;      // <— vertical order inside the timeline
};

// Layer group types

export type LayerGroupId = string;

export type LayerGroup = {
  id: LayerGroupId;
  name: string;
  // optional: for “smart” groups, like “all text”
  filterType?: 'auto-type' | 'manual';
  elementType?: AnyEl['type']; // if filterType === 'auto-type'
  collapsed: boolean;
  order: number;        // for ordering in the sidebar
};

// Canvas types
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
// mouse changes to icon for each tool selected
export type Tool = 'select' | 'draw-text' | 'zoom';

