import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyEl, CanvasPreset, ElementType, TimelineState, Keyframe, AnimationProperty, Tool } from '../Types';
import { fileToDataURL } from '../utils/files';

function uid() { return Math.random().toString(36).slice(2, 9); }

type State = {
    elements: AnyEl[];
    selectedId: string | null;
    preset: CanvasPreset;
    timeline: TimelineState;
    currentTool?: Tool;
    zoom: {
        scale: number;
        min: number;
        max: number;
        step: number;
    };
};

type Actions = {
    setPreset: (p: CanvasPreset) => void;
    addElement: (type: ElementType, init?: Partial<AnyEl>) => void;
    addImageFromFile: (file: File) => Promise<void>;
    replaceImageFromFile: (id: string, file: File) => Promise<void>;
    replaceButtonBgFromFile: (id: string, file: File) => Promise<void>;
    updateElement: (id: string, patch: Partial<AnyEl>) => void;
    removeElement: (id: string) => void;
    select: (id: string | null) => void;
    clear: () => void;
    importJSON: (data: AnyEl[]) => void;

    //Tool actions
    setTool: (tool: Tool) => void;
    setZoom: (scale: number) => void;
    
    // Timeline actions
    playTimeline: () => void;
    pauseTimeline: () => void;
    setTimelineTime: (time: number) => void;
    setTimelineDuration: (duration: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    toggleLoop: () => void;
    addKeyframe: (elementId: string, property: AnimationProperty, time: number, value: number | { x: number; y: number }) => void;
    updateKeyframe: (keyframeId: string, updates: Partial<Keyframe>) => void;
    removeKeyframe: (keyframeId: string) => void;
    createAnimationTrack: (elementId: string) => void;
    toggleTrackVisibility: (trackId: string) => void;
    toggleTrackLock: (trackId: string) => void;
    toggleTrackExpansion: (trackId: string) => void;
};

export const useEditorStore = create<State & Actions>()(
    persist(
        (set) => ({
            elements: [],
            selectedId: null,
            preset: 'desktop',
            timeline: {
                currentTime: 0,
                duration: 10, // 10 seconds default
                isPlaying: false,
                playbackSpeed: 1.0,
                loop: false,
                tracks: []
            },
            currentTool: 'select' as Tool,

            zoom: {
                scale: 1,
                min: 0.5,
                max: 2,
                step: 0.1

            },

            setTool: (tool: Tool) => set({ currentTool: tool }),

            setZoom: (scale: number) => set((s) => ({
                zoom: {
                    scale: Math.min(s.zoom.max, Math.max(s.zoom.min, scale)),
                    min: s.zoom.min,
                    max: s.zoom.max,
                    step: s.zoom.step
                }
            })),

            resetZoom: () => set((s) => ({
                zoom: {
                    ...s.zoom,
                    scale: 1
                }
            })),

            zoomToFit: () =>
                set((s) => ({ 
                    zoom: {
                       ...s.zoom,
                       scale: 1
                    }
            })),

            setPreset: (p) => set({ preset: p }),

            addElement: (type, init) => set((s) => {
                const common = { id: uid(), x: 40, y: 40, width: 200, height: 60, rotation: 0, opacity: 1, visible: true };
                let el: AnyEl;
                if (type === 'text') {
                    el = { ...common, type: 'text', text: 'New text', fontSize: 28, fill: '#111' } as AnyEl;
                } else if (type === 'image') {
                    el = { ...common, type: 'image', src: 'https://picsum.photos/400/240' } as AnyEl;
                } else {
                    el = { ...common, type: 'button', label: 'Click me', fill: '#2563eb', textColor: '#fff', width: 160, height: 48, bgType: 'solid', imageFit: 'cover', } as AnyEl;
                }
                return { elements: [...s.elements, { ...el, ...(init as any) }], selectedId: (el as AnyEl).id };
            }),
            addImageFromFile: async (file) => {
                const dataUrl = await fileToDataURL(file);
                const img = new Image();
                const id = uid();
                img.onload = () => {
                    const naturalW = img.naturalWidth;
                    const naturalH = img.naturalHeight;

                    const maxW = 400;
                    const w = Math.min(naturalW, maxW);
                    const h = Math.round((naturalH / naturalW) * w);

                    set((s) => ({
                        elements: [
                            ...s.elements,
                            {
                                id,
                                type: 'image',
                                x: 40,
                                y: 40,
                                width: w,
                                height: h,
                                src: dataUrl,
                                opacity: 1,
                                visible: true,
                                imageFit: 'cover', // default like CSS background
                                naturalW,
                                naturalH,
                            } as any,
                        ],
                        selectedId: id,
                    }));
                };
                img.src = dataUrl;
            },


            replaceImageFromFile: async (id, file) => {
                const dataUrl = await fileToDataURL(file);
                const img = new Image();
                img.onload = () => {
                    const naturalW = img.naturalWidth;
                    const naturalH = img.naturalHeight;
                    set((s) => ({
                        elements: s.elements.map((e) =>
                            e.id === id
                                ? { ...e, src: dataUrl, naturalW, naturalH }
                                : e
                        ),
                    }));
                };
                img.src = dataUrl;
            },
            replaceButtonBgFromFile: async (id, file) => {
                const dataUrl = await fileToDataURL(file);
                set((s) => ({
                    elements: s.elements.map((e) =>
                        e.id === id && (e as any).type === 'button'
                            ? { ...(e as any), bgType: 'image', bgImageSrc: dataUrl }
                            : e
                    ),
                }));
            },

            updateElement: (id, patch) => set((s) => ({
                elements: s.elements.map((e) => (e.id === id ? { ...e, ...(patch as any) } : e)),
            })),

            removeElement: (id) => set((s) => ({ elements: s.elements.filter((e) => e.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),

            select: (id) => set({ selectedId: id }),

            clear: () => set({ 
                elements: [], 
                selectedId: null,
                timeline: {
                    currentTime: 0,
                    duration: 10,
                    isPlaying: false,
                    playbackSpeed: 1.0,
                    loop: false,
                    tracks: []
                }
            }),

            importJSON: (data) => set({ elements: data, selectedId: null }),

            // Timeline actions
            playTimeline: () => set((s) => ({
                timeline: { ...s.timeline, isPlaying: true }
            })),

            pauseTimeline: () => set((s) => ({
                timeline: { ...s.timeline, isPlaying: false }
            })),

            setTimelineTime: (time) => set((s) => ({
                timeline: { ...s.timeline, currentTime: Math.max(0, Math.min(time, s.timeline.duration)) }
            })),

            setTimelineDuration: (duration) => set((s) => ({
                timeline: { ...s.timeline, duration: Math.max(1, duration) }
            })),

            setPlaybackSpeed: (speed) => set((s) => ({
                timeline: { ...s.timeline, playbackSpeed: speed }
            })),

            toggleLoop: () => set((s) => ({
                timeline: { ...s.timeline, loop: !s.timeline.loop }
            })),

            addKeyframe: (elementId, property, time, value : number | { x: number; y: number }) => set((s) => {
                const trackIndex = s.timeline.tracks.findIndex(t => t.elementId === elementId);
                let tracks = [...s.timeline.tracks];
                
                const keyframe: Keyframe = {
                    id: uid(),
                    time,
                    elementId,
                    property,
                    value,
                    easing: 'ease-out'
                };

                if (trackIndex >= 0) {
                    tracks[trackIndex] = {
                        ...tracks[trackIndex],
                        keyframes: [...tracks[trackIndex].keyframes, keyframe].sort((a, b) => a.time - b.time)
                    };
                } else {
                    tracks.push({
                        id: uid(),
                        elementId,
                        keyframes: [keyframe],
                        visible: true,
                        locked: false,
                        expanded: true
                    });
                }

                return { timeline: { ...s.timeline, tracks } };
            }),

            updateKeyframe: (keyframeId, updates) => set((s) => ({
                timeline: {
                    ...s.timeline,
                    tracks: s.timeline.tracks.map(track => ({
                        ...track,
                        keyframes: track.keyframes.map(kf => 
                            kf.id === keyframeId ? { ...kf, ...updates } : kf
                        )
                    }))
                }
            })),

            removeKeyframe: (keyframeId) => set((s) => ({
                timeline: {
                    ...s.timeline,
                    tracks: s.timeline.tracks.map(track => ({
                        ...track,
                        keyframes: track.keyframes.filter(kf => kf.id !== keyframeId)
                    })).filter(track => track.keyframes.length > 0)
                }
            })),

            createAnimationTrack: (elementId) => set((s) => {
                const existingTrack = s.timeline.tracks.find(t => t.elementId === elementId);
                if (existingTrack) return s;

                return {
                    timeline: {
                        ...s.timeline,
                        tracks: [...s.timeline.tracks, {
                            id: uid(),
                            elementId,
                            keyframes: [],
                            visible: true,
                            locked: false,
                            expanded: true
                        }]
                    }
                };
            }),

            toggleTrackVisibility: (trackId) => set((s) => ({
                timeline: {
                    ...s.timeline,
                    tracks: s.timeline.tracks.map(track =>
                        track.id === trackId ? { ...track, visible: !track.visible } : track
                    )
                }
            })),

            toggleTrackLock: (trackId) => set((s) => ({
                timeline: {
                    ...s.timeline,
                    tracks: s.timeline.tracks.map(track =>
                        track.id === trackId ? { ...track, locked: !track.locked } : track
                    )
                }
            })),

            toggleTrackExpansion: (trackId) => set((s) => ({
                timeline: {
                    ...s.timeline,
                    tracks: s.timeline.tracks.map(track =>
                        track.id === trackId ? { ...track, expanded: !track.expanded } : track
                    )
                }
            })),
        }),
        { name: 'adbuilder-lite' }
    )
);