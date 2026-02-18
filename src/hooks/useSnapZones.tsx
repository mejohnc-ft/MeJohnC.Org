import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SNAP_THRESHOLD = 12;
const MENU_BAR_HEIGHT = 28;
const DOCK_HEIGHT = 64;

export type SnapZone =
  | "left-half"
  | "right-half"
  | "full"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | null;

/** Get the snap zone based on cursor position relative to viewport edges */
function detectSnapZone(clientX: number, clientY: number): SnapZone {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const nearLeft = clientX <= SNAP_THRESHOLD;
  const nearRight = clientX >= vw - SNAP_THRESHOLD;
  const nearTop = clientY <= MENU_BAR_HEIGHT + SNAP_THRESHOLD;
  const nearBottom = clientY >= vh - DOCK_HEIGHT - SNAP_THRESHOLD;

  // Corners take priority
  if (nearTop && nearLeft) return "top-left";
  if (nearTop && nearRight) return "top-right";
  if (nearBottom && nearLeft) return "bottom-left";
  if (nearBottom && nearRight) return "bottom-right";

  // Full screen via top edge
  if (nearTop) return "full";

  // Halves via left/right edges
  if (nearLeft) return "left-half";
  if (nearRight) return "right-half";

  return null;
}

/** Get the target geometry for a snap zone */
export function getSnapGeometry(zone: SnapZone): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (!zone) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const usableHeight = vh - MENU_BAR_HEIGHT - DOCK_HEIGHT;
  const halfW = Math.floor(vw / 2);
  const halfH = Math.floor(usableHeight / 2);

  switch (zone) {
    case "full":
      return { x: 0, y: MENU_BAR_HEIGHT, width: vw, height: usableHeight };
    case "left-half":
      return { x: 0, y: MENU_BAR_HEIGHT, width: halfW, height: usableHeight };
    case "right-half":
      return {
        x: halfW,
        y: MENU_BAR_HEIGHT,
        width: vw - halfW,
        height: usableHeight,
      };
    case "top-left":
      return { x: 0, y: MENU_BAR_HEIGHT, width: halfW, height: halfH };
    case "top-right":
      return { x: halfW, y: MENU_BAR_HEIGHT, width: vw - halfW, height: halfH };
    case "bottom-left":
      return {
        x: 0,
        y: MENU_BAR_HEIGHT + halfH,
        width: halfW,
        height: usableHeight - halfH,
      };
    case "bottom-right":
      return {
        x: halfW,
        y: MENU_BAR_HEIGHT + halfH,
        width: vw - halfW,
        height: usableHeight - halfH,
      };
    default:
      return null;
  }
}

export function useSnapZones() {
  const [activeZone, setActiveZone] = useState<SnapZone>(null);
  const zoneRef = useRef<SnapZone>(null);

  const updateSnapZone = useCallback((clientX: number, clientY: number) => {
    const zone = detectSnapZone(clientX, clientY);
    if (zone !== zoneRef.current) {
      zoneRef.current = zone;
      setActiveZone(zone);
    }
  }, []);

  const clearSnapZone = useCallback(() => {
    zoneRef.current = null;
    setActiveZone(null);
  }, []);

  /** Returns snap geometry if active, or null if no snap */
  const commitSnap = useCallback((): ReturnType<typeof getSnapGeometry> => {
    const zone = zoneRef.current;
    const geo = getSnapGeometry(zone);
    zoneRef.current = null;
    setActiveZone(null);
    return geo;
  }, []);

  return { activeZone, updateSnapZone, clearSnapZone, commitSnap };
}

/** Semi-transparent blue snap preview overlay — portaled to document.body to avoid contain:paint clipping */
export function SnapPreview({ zone }: { zone: SnapZone }) {
  const geo = getSnapGeometry(zone);
  if (!geo) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: geo.x,
        top: geo.y,
        width: geo.width,
        height: geo.height,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      className="bg-blue-500/20 border-2 border-blue-500/40 rounded-lg transition-all duration-150"
    />,
    document.body,
  );
}
