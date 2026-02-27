import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { AnimationProperty, AnimationTrack, Keyframe, AnyEl, } from '../Types';
import { stopAllAnimations } from '../utils/animation';
import {
    ChevronDown,
    ChevronRight,
    Ellipsis,
    Minus,
    Pause,
    Pencil,
    Play,
    Plus,
    SkipBack,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const Timeline: React.FC = () => {
    const {
        elements,
        timeline,
        layerGroups,
        playTimeline,
        pauseTimeline,
        setTimelineTime,
        setTimelineDuration,
        setPlaybackSpeed,
        toggleLoop,
        addKeyframe,
        removeKeyframe,
        createAnimationTrack,
        toggleTrackVisibility,
        toggleTrackLock,
        toggleTrackExpansion,
        toggleGroupCollapsed,
        createGroup,
        assignElementToGroup,
        deleteGroup,
        renameGroup,
    } = useEditorStore();

    console.log('Timeline component rendered with:', {
        elementsCount: elements.length,
        tracksCount: timeline.tracks.length,
        currentTime: timeline.currentTime,
        addKeyframe: typeof addKeyframe,
    });

    const timelineRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState<{ isDragging: boolean; startX: number; startTime: number }>({
        isDragging: false,
        startX: 0,
        startTime: 0,
    });

    const pixelsPerSecond = 100; // Scale factor for timeline
    const timelineWidth = timeline.duration * pixelsPerSecond;

    // --- GROUPED VIEW SETUP ---

    // Sort groups by their order
    const sortedGroups = useMemo(
        () => [...layerGroups].sort((a, b) => a.order - b.order),
        [layerGroups]
    );

    // Map elements by layerGroupId (null = ungrouped), sorted by layerOrder
    const elementsByGroup = useMemo(() => {
        const map = new Map<string | null, AnyEl[]>();

        elements.forEach((el) => {
            const key = (el as any).layerGroupId ?? null;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(el);
        });

        // sort each bucket by layerOrder (fallback to index)
        for (const [key, bucket] of map.entries()) {
            bucket.sort((a: any, b: any) => {
                const ao = a.layerOrder ?? 0;
                const bo = b.layerOrder ?? 0;
                return ao - bo;
            });
            map.set(key, bucket);
        }

        return map;
    }, [elements]);

    const ungroupedElements = elementsByGroup.get(null) ?? [];
    const [groupIdToDelete, setGroupIdToDelete] = useState<string>('');

    // --- PLAYBACK / SCRUBBER LOGIC ---

    useEffect(() => {
        if (!timeline.isPlaying) {
            stopAllAnimations();
        }
    }, [timeline.isPlaying]);

    useEffect(() => {
        if (!timeline.isPlaying) return;

        const interval = setInterval(() => {
            const newTime = timeline.currentTime + (1 / 30) * timeline.playbackSpeed; // 30fps updates

            if (newTime >= timeline.duration) {
                if (timeline.loop) {
                    setTimelineTime(0);
                } else {
                    pauseTimeline();
                }
            } else {
                setTimelineTime(newTime);
            }
        }, 1000 / 30);

        return () => clearInterval(interval);
    }, [
        timeline.isPlaying,
        timeline.currentTime,
        timeline.duration,
        timeline.loop,
        timeline.playbackSpeed,
        setTimelineTime,
        pauseTimeline,
    ]);

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / pixelsPerSecond;
        setTimelineTime(Math.max(0, Math.min(time, timeline.duration)));
    };

    const handleScrubberMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDragState({
            isDragging: true,
            startX: e.clientX,
            startTime: timeline.currentTime,
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragState.isDragging) return;

        const deltaX = e.clientX - dragState.startX;
        const deltaTime = deltaX / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(dragState.startTime + deltaTime, timeline.duration));
        setTimelineTime(newTime);
    };

    const handleMouseUp = () => {
        setDragState({ isDragging: false, startX: 0, startTime: 0 });
    };

    useEffect(() => {
        if (dragState.isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragState.isDragging]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

    const createTrackForElement = (elementId: string) => {
        createAnimationTrack(elementId);
    };

    const addKeyframeAtCurrentTime = (elementId: string, property: AnimationProperty) => {
        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        let currentValue: number | { x: number; y: number };
        switch (property) {
            case 'position':
                currentValue = { x: Number(element.x) || 0, y: Number(element.y) || 0 };
                break;
            case 'width':
                currentValue = element.width;
                break;
            case 'height':
                currentValue = element.height;
                break;
            case 'rotation':
                currentValue = (element as any).rotation || 0;
                break;
            case 'opacity':
                currentValue = (element as any).opacity ?? 1;
                break;
            case 'scale':
                currentValue = 1;
                break;
            default:
                currentValue = 0;
        }

        addKeyframe(elementId, property, timeline.currentTime, currentValue);
    };

    const renderTimeRuler = () => {
        const ticks = [];
        const step = 1;

        for (let i = 0; i <= timeline.duration; i += step) {
            ticks.push(
                <div key={i} className="absolute flex flex-col items-center" style={{ left: i * pixelsPerSecond }}>
                    <div className="w-px h-3 bg-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">{formatTime(i)}</span>
                </div>
            );
        }

        return ticks;
    };

    const renderTrack = (track: AnimationTrack) => {
        const element = elements.find((el) => el.id === track.elementId);
        if (!element) return null;

        const properties: AnimationProperty[] = ['position', 'width', 'height', 'rotation', 'opacity'];
        const allKeyframes = [...track.keyframes].sort((a, b) => a.time - b.time);

        return (
            <div key={track.id} className="border-b border-gray-200">
                {/* Track Header */}
                <div className="flex items-center h-10 bg-gray-50 px-2 border-r border-gray-200">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleTrackVisibility(track.id)}
                        className={`mr-2 h-4 w-4 min-h-4 min-w-4 p-0 ${track.visible ? 'bg-blue-500 hover:bg-blue-500' : 'bg-gray-300 hover:bg-gray-300'}`}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleTrackLock(track.id)}
                        className={`mr-2 h-4 w-4 min-h-4 min-w-4 p-0 ${track.locked ? 'bg-red-500 hover:bg-red-500' : 'bg-gray-300 hover:bg-gray-300'}`}
                    />
                    <Button
                        variant="ghost"
                        onClick={() => toggleTrackExpansion(track.id)}
                        className="h-8 flex-1 justify-start text-left hover:bg-gray-100 rounded px-1 -mx-1"
                    >
                        <ChevronRight className={`h-3 w-3 mr-2 transition-transform ${track.expanded ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-medium truncate" title={`${element.type} #${element.id.slice(0, 4)}`}>
                            {element.type} #{element.id.slice(0, 4)}
                        </span>
                        {!track.expanded && allKeyframes.length > 0 && (
                            <span className="text-xs text-gray-500 ml-2">({allKeyframes.length} keyframes)</span>
                        )}
                    </Button>
                </div>

                {/* Collapsed: all keyframes on one row */}
                {!track.expanded && allKeyframes.length > 0 && (
                    <div className="relative h-8 bg-white border-b border-gray-100 flex items-center">
                        <div className="flex-1 relative">
                            {allKeyframes.map((kf) => (
                                <KeyframeMarker
                                    key={kf.id}
                                    keyframe={kf}
                                    pixelsPerSecond={pixelsPerSecond}
                                    onRemove={() => removeKeyframe(kf.id)}
                                    showPropertyLabel
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Expanded: per-property rows */}
                {track.expanded &&
                    properties.map((property) => (
                        <div key={property} className="relative h-8 bg-white border-b border-gray-100 flex items-center">
                            <div className="flex-1 relative">
                                {track.keyframes
                                    .filter((kf) => kf.property === property)
                                    .map((kf) => (
                                        <KeyframeMarker
                                            key={kf.id}
                                            keyframe={kf}
                                            pixelsPerSecond={pixelsPerSecond}
                                            onRemove={() => removeKeyframe(kf.id)}
                                        />
                                    ))}
                            </div>
                        </div>
                    ))}
            </div>
        );
    };

    // A single row on the LEFT side for an element (label + property buttons)
    const renderLayerRow = (
        element: AnyEl,
        track: AnimationTrack | undefined,
        indent: boolean = false
    ) => {
        const hasTrack = !!track;
        const hasKeyframes = !!track && track.keyframes.length > 0;
        const properties: AnimationProperty[] = ['position', 'width', 'height', 'rotation', 'opacity'];
        const currentGroupId = (element as any).layerGroupId ?? '';

        return (
            <div key={element.id} className={`border-b border-gray-200 ${indent ? 'ml-3' : ''}`}>
                <div className="h-10 flex items-center px-2 justify-between gap-1">
                    <span className="text-sm truncate" title={element.type}>
                        {element.type}
                    </span>

                    {/* Group selector */}
                    <select
                        className="text-[11px] border border-border rounded-md px-1 max-w-20 h-7 bg-background"
                        value={currentGroupId}
                        onChange={(e) => {
                            const value = e.target.value;
                            assignElementToGroup(element.id, value === '' ? null : value);
                        }}
                    >
                        <option value="">No group</option>
                        {layerGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </select>

                    {/* Track create / expand button */}
                    {!hasTrack ? (
                        <Button
                            size="icon"
                            variant="default"
                            onClick={() => createTrackForElement(element.id)}
                            className="h-6 w-6"
                            title="Create animation track"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    ) : (
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => toggleTrackExpansion(track!.id)}
                            className="h-6 w-6"
                            title="Expand / collapse properties"
                        >
                            {track!.expanded ? <Minus className="h-3 w-3" /> : <Ellipsis className="h-3 w-3" />}
                        </Button>
                    )}
                </div>

                {hasTrack &&
                    (track!.expanded ? (
                        <div className="text-xs text-gray-600">
                            {properties.map((prop) => (
                                <div
                                    key={prop}
                                    className="h-8 px-2 flex items-center justify-between border-t border-gray-100"
                                >
                                    <span>{prop}</span>
                                    <Button
                                        size="icon"
                                        variant="default"
                                        onClick={() => addKeyframeAtCurrentTime(element.id, prop)}
                                        className="w-4 h-4 min-w-4 min-h-4"
                                        title={`Add ${prop} keyframe`}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        hasKeyframes && <div className="h-8 border-t border-gray-100" />
                    ))}
            </div>
        );
    };


    // When an element has no track, we still render a blank row on the right so things line up
    const renderEmptyTrackRow = (key: string) => (
        <div key={key} className="border-b border-gray-200">
            <div className="h-10 bg-white" />
        </div>
    );

    return (
        <Card className="rounded-none border-x-0 border-b-0 flex flex-col h-64 p-0 overflow-hidden">
            {/* Timeline Controls */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                <Button
                    onClick={() => {
                        if (timeline.isPlaying) {
                            pauseTimeline();
                        } else {
                            playTimeline();
                        }
                    }}
                    size="sm"
                >
                    {timeline.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button
                    onClick={() => setTimelineTime(0)}
                    size="sm"
                    variant="secondary"
                >
                    <SkipBack className="h-4 w-4" />
                </Button>

                <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {formatTime(timeline.currentTime)} / {formatTime(timeline.duration)}
                </div>

                <label className="text-sm flex items-center gap-1">
                    Speed:
                    <select
                        value={timeline.playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        className="text-xs border border-border rounded-md px-1 h-8 bg-background"
                    >
                        <option value={0.25}>0.25x</option>
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                    </select>
                </label>

                <label className="text-sm flex items-center gap-1">
                    <Checkbox checked={timeline.loop} onCheckedChange={() => toggleLoop()} />
                    Loop
                </label>

                <label className="text-sm flex items-center gap-1">
                    Duration:
                    <Input
                        type="number"
                        min="1"
                        max="60"
                        value={timeline.duration}
                        onChange={(e) => setTimelineDuration(Number(e.target.value))}
                        className="w-16 h-8 text-xs"
                    />
                    s
                </label>
                <Button
                    onClick={() => {
                        // simple default name; you can swap this for a prompt() if you like
                        const defaultName = `Group ${layerGroups.length + 1}`;
                        createGroup(prompt('New group name:', '') || defaultName);
                    }}
                    size="sm"
                    variant="secondary"
                    className="ml-4"
                >
                    + Group
                </Button>
                {/* Group delete selector */}
                <select
                    className="px-2 py-1 text-xs bg-background border border-border rounded-md h-8"
                    value={groupIdToDelete}
                    onChange={(e) => setGroupIdToDelete(e.target.value)}
                >
                    <option value="">Select group…</option>
                    {layerGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </select>

                <Button
                    onClick={() => {
                        if (!groupIdToDelete) return; // nothing selected

                        deleteGroup(groupIdToDelete);
                        setGroupIdToDelete(''); // reset after delete
                    }}
                    size="sm"
                    variant="secondary"
                >
                    Delete group
                </Button>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 overflow-auto">
                <div className="flex">
                    {/* Track Labels (LEFT) */}
                    <div className="w-32 bg-gray-50 border-r border-gray-200">
                        <div className="h-12 bg-gray-100 border-b border-gray-200 flex items-center px-2">
                            <span className="text-sm font-medium">Layers</span>
                        </div>

                        {/* Ungrouped elements */}
                        {ungroupedElements.map((element) => {
                            const track = timeline.tracks.find((t) => t.elementId === element.id);
                            return renderLayerRow(element, track, false);
                        })}

                        {/* Grouped elements */}
                        {sortedGroups.map((group) => {
                            const groupElements = elementsByGroup.get(group.id) ?? [];
                            if (groupElements.length === 0) return null;

                            return (
                                <div key={group.id} className="border-b border-gray-200">
                                    {/* Folder header */}
                                    <div
                                        className="h-8 flex items-center px-2 bg-gray-100 cursor-pointer"
                                        onClick={() => toggleGroupCollapsed(group.id)}
                                    >
                                        {group.collapsed ? <ChevronRight className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                                        <span className="text-xs font-semibold truncate">{group.name}</span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                                renameGroup(group.id, prompt('New group name:', group.name) || group.name)
                                            }} className="h-6 w-6"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                                deleteGroup(group.id);
                                            }} className="h-6 w-6"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Elements inside group */}
                                    {!group.collapsed &&
                                        groupElements.map((element) => {
                                            const track = timeline.tracks.find((t) => t.elementId === element.id);
                                            return renderLayerRow(element, track, true);
                                        })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline Canvas (RIGHT) */}
                    <div className="flex-1 relative">
                        {/* Time Ruler */}
                        <div className="h-12 bg-gray-100 border-b border-gray-200 relative">
                            {renderTimeRuler()}
                        </div>

                        {/* Timeline Background */}
                        <div
                            ref={timelineRef}
                            className="relative bg-white cursor-pointer"
                            style={{ width: timelineWidth }}
                            onClick={handleTimelineClick}
                        >
                            {/* Current Time Scrubber */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-grab active:cursor-grabbing"
                                style={{ left: timeline.currentTime * pixelsPerSecond }}
                                onMouseDown={handleScrubberMouseDown}
                            >
                                <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 -mt-1.5 absolute" />
                            </div>

                            {/* Tracks for UNGROUPED elements */}
                            {ungroupedElements.map((element) => {
                                const track = timeline.tracks.find((t) => t.elementId === element.id);
                                if (track) return renderTrack(track);
                                return renderEmptyTrackRow(`empty-${element.id}`);
                            })}

                            {/* Tracks for GROUPS */}
                            {sortedGroups.map((group) => {
                                const groupElements = elementsByGroup.get(group.id) ?? [];
                                if (groupElements.length === 0) return null;

                                return (
                                    <div key={group.id} className="border-b border-gray-200">
                                        {/* Folder header spacer: height matches left folder row */}
                                        <div className="h-8 bg-gray-100 border-b border-gray-200" />
                                        {/* Elements inside group */}
                                        {!group.collapsed &&
                                            groupElements.map((element) => {
                                                const track = timeline.tracks.find((t) => t.elementId === element.id);
                                                if (track) return renderTrack(track);
                                                return renderEmptyTrackRow(`empty-${group.id}-${element.id}`);
                                            })}
                                    </div>
                                );
                            })}

                            {/* Grid lines */}
                            {Array.from({ length: Math.ceil(timeline.duration) + 1 }, (_, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 w-px bg-gray-200"
                                    style={{ left: i * pixelsPerSecond }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

// Keyframe marker component
const KeyframeMarker: React.FC<{
    keyframe: Keyframe;
    pixelsPerSecond: number;
    onRemove: () => void;
    showPropertyLabel?: boolean;
}> = ({ keyframe, pixelsPerSecond, onRemove, showPropertyLabel = false }) => {
    const propertyColors: Record<string, string> = {
        position: 'bg-red-500 hover:bg-red-600',
        width: 'bg-blue-500 hover:bg-blue-600',
        height: 'bg-purple-500 hover:bg-purple-600',
        rotation: 'bg-yellow-500 hover:bg-yellow-600',
        opacity: 'bg-gray-500 hover:bg-gray-600',
        scale: 'bg-pink-500 hover:bg-pink-600',
    };

    const colorClass = showPropertyLabel
        ? propertyColors[keyframe.property] || 'bg-blue-500 hover:bg-blue-600'
        : 'bg-blue-500 hover:bg-blue-600';

    return (
        <div
            className={`absolute w-2 h-2 ${colorClass} rounded-full cursor-pointer`}
            style={{
                left: keyframe.time * pixelsPerSecond,
                transform: 'translateY(-50%)',
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                    onRemove();
                }
            }}
            title={`${keyframe.property}: ${keyframe.value} @ ${keyframe.time.toFixed(2)}s (Shift+click to remove)`}
        />
    );
};

export default Timeline;
