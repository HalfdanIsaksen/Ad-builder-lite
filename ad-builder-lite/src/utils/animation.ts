import type { AnimationTrack, Keyframe, AnyEl, EasingType } from '../Types';

// Easing functions
const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t: number) => t,
  ease: (t: number) => t * t * (3.0 - 2.0 * t), // smoothstep
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2.0 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t,
  bounce: (t: number) => {
    if (t < 1/2.75) {
      return 7.5625 * t * t;
    } else if (t < 2/2.75) {
      return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
    } else if (t < 2.5/2.75) {
      return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
    }
  },
  elastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }
};

// Get the animated value for a property at a specific time
export function getAnimatedValue(
  baseValue: number,
  property: string,
  elementId: string,
  currentTime: number,
  tracks: AnimationTrack[]
): number {
  const track = tracks.find(t => t.elementId === elementId);
  if (!track) return baseValue;

  const keyframes = track.keyframes.filter(kf => kf.property === property).sort((a, b) => a.time - b.time);
  if (keyframes.length === 0) return baseValue;

  // If current time is before first keyframe, return base value
  if (currentTime <= keyframes[0].time) {
    return keyframes[0].value;
  }

  // If current time is after last keyframe, return last value
  if (currentTime >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find the two keyframes to interpolate between
  let prevKeyframe: Keyframe | null = null;
  let nextKeyframe: Keyframe | null = null;

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (currentTime >= keyframes[i].time && currentTime <= keyframes[i + 1].time) {
      prevKeyframe = keyframes[i];
      nextKeyframe = keyframes[i + 1];
      break;
    }
  }

  if (!prevKeyframe || !nextKeyframe) {
    return baseValue;
  }

  // Calculate interpolation progress (0-1)
  const duration = nextKeyframe.time - prevKeyframe.time;
  const progress = duration > 0 ? (currentTime - prevKeyframe.time) / duration : 0;

  // Apply easing function
  const easing = nextKeyframe.easing || 'ease-out';
  const easedProgress = easingFunctions[easing](Math.max(0, Math.min(1, progress)));

  // Interpolate between values
  return prevKeyframe.value + (nextKeyframe.value - prevKeyframe.value) * easedProgress;
}

// Apply all animations to an element
export function getAnimatedElement(
  element: AnyEl,
  currentTime: number,
  tracks: AnimationTrack[]
): AnyEl {
  const animatedElement = { ...element };

  // Apply animations for each supported property
  animatedElement.x = getAnimatedValue(element.x, 'x', element.id, currentTime, tracks);
  animatedElement.y = getAnimatedValue(element.y, 'y', element.id, currentTime, tracks);
  animatedElement.width = getAnimatedValue(element.width, 'width', element.id, currentTime, tracks);
  animatedElement.height = getAnimatedValue(element.height, 'height', element.id, currentTime, tracks);
  animatedElement.rotation = getAnimatedValue(element.rotation || 0, 'rotation', element.id, currentTime, tracks);
  animatedElement.opacity = getAnimatedValue(element.opacity || 1, 'opacity', element.id, currentTime, tracks);

  // Scale is applied as a multiplier to width/height
  const scale = getAnimatedValue(1, 'scale', element.id, currentTime, tracks);
  if (scale !== 1) {
    animatedElement.width *= scale;
    animatedElement.height *= scale;
  }

  return animatedElement;
}

// Check if an element has any animations
export function hasAnimations(elementId: string, tracks: AnimationTrack[]): boolean {
  return tracks.some(track => track.elementId === elementId && track.keyframes.length > 0);
}

// Get all animated properties for an element
export function getAnimatedProperties(elementId: string, tracks: AnimationTrack[]): string[] {
  const track = tracks.find(t => t.elementId === elementId);
  if (!track) return [];
  
  const properties = new Set(track.keyframes.map(kf => kf.property));
  return Array.from(properties);
}