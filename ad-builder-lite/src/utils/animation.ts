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

  // Safety checks
  if (!node || !elementId || !tracks) return;
  
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
 // Handle position property specially
    if (property === 'position') {
      // Set initial position based on current time
      const initialPosition = getAnimatedPosition(elementId, currentTime, tracks);
      node.setAttr('x', initialPosition.x);
      node.setAttr('y', initialPosition.y);
      node.getLayer()?.batchDraw();

      // Create sequential tweens for future position keyframes
      let lastTime = currentTime;
      
      futureKeyframes.forEach((kf) => {
        const duration = (kf.time - lastTime) * 1000 / playbackSpeed;
        const delay = (lastTime - currentTime) * 1000 / playbackSpeed;
        
        const position = kf.value as { x: number; y: number };
        
        const tween = new Konva.Tween({
          node,
          duration,
          easing: getKonvaEasing(kf.easing || 'ease-out'),
          x: position.x,
          y: position.y
        });
        
        if (delay > 0) {
          setTimeout(() => tween.play(), delay);
        } else {
          setTimeout(() => tween.play(), 16);
        }
        
        animations.push(tween);
        lastTime = kf.time;
      });
    } else {
      // Handle other properties (width, height, rotation, opacity, scale)
      const initialValue = getAnimatedValue(elementId, property, currentTime, tracks);
      
      if (property === 'scale') {
        node.scaleX(initialValue);
        node.scaleY(initialValue);
      } else {
        node.setAttr(property, initialValue);
      }
      node.getLayer()?.batchDraw();
      
      let lastTime = currentTime;
      
      futureKeyframes.forEach((kf) => {
        const duration = (kf.time - lastTime) * 1000 / playbackSpeed;
        const delay = (lastTime - currentTime) * 1000 / playbackSpeed;
        
        const tweenConfig: any = {
          node,
          duration,
          easing: getKonvaEasing(kf.easing || 'ease-out')
        };

        if (property === 'scale') {
          tweenConfig.scaleX = kf.value;
          tweenConfig.scaleY = kf.value;
        } else {
          tweenConfig[property] = kf.value;
        }

        const tween = new Konva.Tween(tweenConfig);
        
        if (delay > 0) {
          setTimeout(() => tween.play(), delay);
        } else {
          setTimeout(() => tween.play(), 16);
        }
        
        animations.push(tween);
        lastTime = kf.time;
      });
    }
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

export function getAnimatedPosition(
  elementId: string,
  currentTime: number,
  tracks: AnimationTrack[]
): { x: number; y: number } {
  const track = tracks.find(t => t.elementId === elementId);
  if (!track) return { x: 0, y: 0 };

  const keyframes = track.keyframes.filter(kf => kf.property === 'position').sort((a, b) => a.time - b.time);
  if (keyframes.length === 0) return { x: 0, y: 0 };

  // If current time is before first keyframe
  if (currentTime <= keyframes[0].time) {
    return keyframes[0].value as { x: number; y: number };
  }

  // If current time is after last keyframe
  if (currentTime >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value as { x: number; y: number };
  }

  // Find the two keyframes to interpolate between
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (currentTime >= keyframes[i].time && currentTime <= keyframes[i + 1].time) {
      const prevKeyframe = keyframes[i];
      const nextKeyframe = keyframes[i + 1];
      
      const duration = nextKeyframe.time - prevKeyframe.time;
      const progress = duration > 0 ? (currentTime - prevKeyframe.time) / duration : 0;
      
      const easing = getKonvaEasing(nextKeyframe.easing || 'ease-out');
      const easedProgress = easing(progress, 0, 1, 1);
      
      const prevPos = prevKeyframe.value as { x: number; y: number };
      const nextPos = nextKeyframe.value as { x: number; y: number };
      
      return {
        x: prevPos.x + (nextPos.x - prevPos.x) * easedProgress,
        y: prevPos.y + (nextPos.y - prevPos.y) * easedProgress
      };
    }
  }

  return { x: 0, y: 0 };
}

// Get the animated value for a single property at a specific time (for timeline scrubbing)
export function getAnimatedValue(
  elementId: string,
  property: string,
  currentTime: number,
  tracks: AnimationTrack[]
): number {
  const track = tracks.find(t => t.elementId === elementId);
  if (!track) return property === 'opacity' ? 1 : 0;

  const keyframes = track.keyframes.filter(kf => kf.property === property).sort((a, b) => a.time - b.time);
  if (keyframes.length === 0) return property === 'opacity' ? 1 : 0;

  // If current time is before first keyframe
  if (currentTime <= keyframes[0].time) {
    return keyframes[0].value as number;
  }

  // If current time is after last keyframe
  if (currentTime >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value as number;
  }

  // Find the two keyframes to interpolate between
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (currentTime >= keyframes[i].time && currentTime <= keyframes[i + 1].time) {
      const prevKeyframe = keyframes[i];
      const nextKeyframe = keyframes[i + 1];
      
      const duration = nextKeyframe.time - prevKeyframe.time;
      const progress = duration > 0 ? (currentTime - prevKeyframe.time) / duration : 0;
      
      const easing = getKonvaEasing(nextKeyframe.easing || 'ease-out');
      const easedProgress = easing(progress, 0, 1, 1);
      
      const prevValue = prevKeyframe.value as number;
      const nextValue = nextKeyframe.value as number;
      
      return prevValue + (nextValue - prevValue) * easedProgress;
    }
  }

  return property === 'opacity' ? 1 : 0;
}

// Apply all animations to an element (for timeline scrubbing)
export function getAnimatedElement(
  element: AnyEl,
  currentTime: number,
  tracks: AnimationTrack[]
): AnyEl {
  const animatedElement = { ...element };

  // Handle position as a combined property
  const position = getAnimatedPosition(element.id, currentTime, tracks);
  if (position.x !== 0 || position.y !== 0) {
    animatedElement.x = position.x;
    animatedElement.y = position.y;
  }

  // Handle other properties
  const animatedWidth = getAnimatedValue(element.id, 'width', currentTime, tracks);
  if (animatedWidth !== 0) animatedElement.width = animatedWidth;

  const animatedHeight = getAnimatedValue(element.id, 'height', currentTime, tracks);
  if (animatedHeight !== 0) animatedElement.height = animatedHeight;

  const animatedRotation = getAnimatedValue(element.id, 'rotation', currentTime, tracks);
  animatedElement.rotation = animatedRotation;

  const animatedOpacity = getAnimatedValue(element.id, 'opacity', currentTime, tracks);
  animatedElement.opacity = animatedOpacity;

  // Scale is applied as a multiplier to width/height
  const scale = getAnimatedValue(element.id, 'scale', currentTime, tracks);
  if (scale !== 1 && scale !== 0) {
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