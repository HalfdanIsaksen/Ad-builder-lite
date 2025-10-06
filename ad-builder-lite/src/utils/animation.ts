import Konva from 'konva';
import type { AnimationTrack, Keyframe, AnyEl, EasingType } from '../Types';

// Active Konva animations registry
const activeAnimations = new Map<string, Konva.Tween[]>();

// Map our easing types to Konva's easing functions
function getKonvaEasing(easing: EasingType): (t: number, b: number, c: number, d: number) => number {
  switch (easing) {
    case 'linear': return Konva.Easings.Linear;
    case 'ease': return Konva.Easings.EaseInOut;
    case 'ease-in': return Konva.Easings.EaseIn;
    case 'ease-out': return Konva.Easings.EaseOut;
    case 'ease-in-out': return Konva.Easings.EaseInOut;
    case 'bounce': return Konva.Easings.BounceEaseOut;
    case 'elastic': return (t, b, c, d) => Konva.Easings.ElasticEaseOut(t, b, c, d, 1, 0.3);
    default: return Konva.Easings.EaseOut;
  }
}

// Create Konva tweens for element animation starting from current time
export function createKonvaAnimations(
  node: Konva.Node,
  elementId: string,
  tracks: AnimationTrack[],
  currentTime: number = 0,
  playbackSpeed: number = 1
): void {
  // Clear existing animations
  stopElementAnimations(elementId);

  const track = tracks.find(t => t.elementId === elementId);
  if (!track || track.keyframes.length === 0) return;

  const animations: Konva.Tween[] = [];
  
  // Group keyframes by property
  const propertiesMap = new Map<string, Keyframe[]>();
  track.keyframes.forEach(kf => {
    if (!propertiesMap.has(kf.property)) {
      propertiesMap.set(kf.property, []);
    }
    propertiesMap.get(kf.property)!.push(kf);
  });

  // Create tweens for each property
  propertiesMap.forEach((keyframes, property) => {
    keyframes.sort((a, b) => a.time - b.time);
    
    // Find keyframes that occur after current time
    const futureKeyframes = keyframes.filter(kf => kf.time > currentTime);
    if (futureKeyframes.length === 0) return;

    // Set initial value based on current time
    const initialValue = getAnimatedValue(
      node.getAttr(property === 'scale' ? 'scaleX' : property) || 0,
      property,
      elementId,
      currentTime,
      tracks
    );

    if (property === 'scale') {
      node.scaleX(initialValue);
      node.scaleY(initialValue);
    } else {
      node.setAttr(property, initialValue);
    }
    
    // Create sequential tweens for future keyframes
    let lastTime = currentTime;
    let lastValue = initialValue;
    
    futureKeyframes.forEach((kf) => {
      const duration = (kf.time - lastTime) * 1000 / playbackSpeed; // Convert to ms and apply speed
      const delay = (lastTime - currentTime) * 1000 / playbackSpeed; // Delay relative to animation start
      
      const tweenConfig: any = {
        node,
        duration,
        easing: getKonvaEasing(kf.easing || 'ease-out')
      };

      // Set the property to animate
      if (property === 'scale') {
        tweenConfig.scaleX = kf.value;
        tweenConfig.scaleY = kf.value;
      } else {
        tweenConfig[property] = kf.value;
      }

      const tween = new Konva.Tween(tweenConfig);
      
      // Delay the start of this tween
      if (delay > 0) {
        setTimeout(() => tween.play(), delay);
      } else {
        tween.play();
      }
      
      animations.push(tween);
      
      lastTime = kf.time;
      lastValue = kf.value;
    });
  });

  activeAnimations.set(elementId, animations);
}

// Stop all animations for an element
export function stopElementAnimations(elementId: string): void {
  const animations = activeAnimations.get(elementId);
  if (animations) {
    animations.forEach(tween => {
      tween.destroy();
    });
    activeAnimations.delete(elementId);
  }
}

// Stop all active animations
export function stopAllAnimations(): void {
  activeAnimations.forEach((animations) => {
    animations.forEach(tween => tween.destroy());
  });
  activeAnimations.clear();
}

// Get the animated value for a property at a specific time (for timeline scrubbing)
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

  // If current time is before first keyframe, return first keyframe value
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

  // Apply easing using Konva's easing function
  const easing = getKonvaEasing(nextKeyframe.easing || 'ease-out');
  const easedProgress = easing(progress, 0, 1, 1);

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