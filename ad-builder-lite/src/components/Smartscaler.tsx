import React, { useEffect, useMemo, useRef, useState } from "react";

type ScaleMode = "proportional" | "stretch";

type SmartScalerProps = {
  /** The “design-time” width/height your content was built for (e.g. Figma frame). */
  designWidth: number;
  designHeight: number;
  /** Scaling behavior. */
  mode: ScaleMode;
  /** Optional: add rounded corners, borders, etc. on the outer container. */
  className?: string;
  /** Your UI/artboard/content at design size. */
  children: React.ReactNode;
};

/**
 * Measures an element using ResizeObserver.
 */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ width: cr.width, height: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size } as const;
}

/**
 * SmartScaler
 * - Wraps a fixed-size "design surface" and scales it to the container.
 * - 'proportional' keeps aspect ratio (letterbox/pillarbox as needed).
 * - 'stretch' fills in both directions (may distort).
 */
export default function SmartScaler({
  designWidth,
  designHeight,
  mode,
  className,
  children,
}: SmartScalerProps) {
  const { ref: containerRef, size: container } = useElementSize<HTMLDivElement>();

  // Compute transform + translation to center content
  const { scaleX, scaleY, translateX, translateY } = useMemo(() => {
    const cw = Math.max(0, container.width);
    const ch = Math.max(0, container.height);
    const dw = Math.max(1, designWidth);
    const dh = Math.max(1, designHeight);

    if (cw === 0 || ch === 0) {
      return { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
    }

    if (mode === "proportional") {
      const s = Math.min(cw / dw, ch / dh);
      const tx = (cw - dw * s) / 2;
      const ty = (ch - dh * s) / 2;
      return { scaleX: s, scaleY: s, translateX: tx, translateY: ty };
    }

    // stretch
    const sx = cw / dw;
    const sy = ch / dh;
    const tx = (cw - dw * sx) / 2;
    const ty = (ch - dh * sy) / 2;
    return { scaleX: sx, scaleY: sy, translateX: tx, translateY: ty };
  }, [container.width, container.height, designWidth, designHeight, mode]);

  return (
    <div
      ref={containerRef}
      className={["smart-scaler-container", className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        // Optional: background to visualize letterboxing in proportional mode
        // background: "var(--scaler-bg, #f6f6f6)",
      }}
    >
      {/* The design surface lives at its native size, scaled from top-left */}
      <div
        className="smart-scaler-surface"
        style={{
          position: "absolute",
          width: designWidth,
          height: designHeight,
          transformOrigin: "top left",
          transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
