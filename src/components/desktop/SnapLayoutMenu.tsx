import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MENU_BAR_HEIGHT, DOCK_HEIGHT } from "@/lib/desktop-constants";

export type TileLayout =
  | "left-half"
  | "right-half"
  | "full"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-third"
  | "center-third"
  | "right-third"
  | "center-half";

const LAYOUTS: { id: TileLayout; label: string; grid: boolean[] }[] = [
  // Row 1: halves and full
  {
    id: "left-half",
    label: "Left Half",
    grid: [true, false, false, true, false, false],
  },
  {
    id: "right-half",
    label: "Right Half",
    grid: [false, false, true, false, false, true],
  },
  {
    id: "full",
    label: "Full Screen",
    grid: [true, true, true, true, true, true],
  },
  // Row 2: quarters
  {
    id: "top-left",
    label: "Top Left",
    grid: [true, false, false, false, false, false],
  },
  {
    id: "top-right",
    label: "Top Right",
    grid: [false, false, true, false, false, false],
  },
  {
    id: "bottom-left",
    label: "Bottom Left",
    grid: [false, false, false, true, false, false],
  },
  {
    id: "bottom-right",
    label: "Bottom Right",
    grid: [false, false, false, false, false, true],
  },
  // Row 3: thirds and center (6x2 grid for visual distinction from halves)
  {
    id: "left-third",
    label: "Left Third",
    grid: [
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
    ],
  },
  {
    id: "center-third",
    label: "Center Third",
    grid: [
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
    ],
  },
  {
    id: "right-third",
    label: "Right Third",
    grid: [
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
    ],
  },
  {
    id: "center-half",
    label: "Center Half",
    grid: [
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
    ],
  },
];

export function getTileGeometry(layout: TileLayout): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const usableH = vh - MENU_BAR_HEIGHT - DOCK_HEIGHT;
  const halfW = Math.floor(vw / 2);
  const thirdW = Math.floor(vw / 3);
  const halfH = Math.floor(usableH / 2);

  switch (layout) {
    case "full":
      return { x: 0, y: MENU_BAR_HEIGHT, width: vw, height: usableH };
    case "left-half":
      return { x: 0, y: MENU_BAR_HEIGHT, width: halfW, height: usableH };
    case "right-half":
      return {
        x: halfW,
        y: MENU_BAR_HEIGHT,
        width: vw - halfW,
        height: usableH,
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
        height: usableH - halfH,
      };
    case "bottom-right":
      return {
        x: halfW,
        y: MENU_BAR_HEIGHT + halfH,
        width: vw - halfW,
        height: usableH - halfH,
      };
    case "left-third":
      return { x: 0, y: MENU_BAR_HEIGHT, width: thirdW, height: usableH };
    case "center-third":
      return { x: thirdW, y: MENU_BAR_HEIGHT, width: thirdW, height: usableH };
    case "right-third":
      return {
        x: thirdW * 2,
        y: MENU_BAR_HEIGHT,
        width: vw - thirdW * 2,
        height: usableH,
      };
    case "center-half":
      return {
        x: Math.floor(vw / 4),
        y: MENU_BAR_HEIGHT,
        width: halfW,
        height: usableH,
      };
    default:
      return { x: 0, y: MENU_BAR_HEIGHT, width: vw, height: usableH };
  }
}

interface SnapLayoutMenuProps {
  anchorX: number;
  anchorY: number;
  onSelect: (layout: TileLayout) => void;
  onClose: () => void;
}

export default function SnapLayoutMenu({
  anchorX,
  anchorY,
  onSelect,
  onClose,
}: SnapLayoutMenuProps) {
  const [hoveredId, setHoveredId] = useState<TileLayout | null>(null);

  // Common layouts to show in the popup
  const mainLayouts = LAYOUTS.slice(0, 7);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          className="absolute bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-2"
          style={{ left: anchorX - 100, top: anchorY + 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] text-muted-foreground px-2 py-1 font-medium">
            Snap Layout
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-1">
            {mainLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => {
                  onSelect(layout.id);
                  onClose();
                }}
                onMouseEnter={() => setHoveredId(layout.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`p-1.5 rounded transition-colors ${
                  hoveredId === layout.id
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-muted"
                }`}
                title={layout.label}
              >
                <div className="grid grid-cols-3 grid-rows-2 gap-px w-8 h-5">
                  {layout.grid.map((active, i) => (
                    <div
                      key={i}
                      className={`rounded-[1px] ${
                        active
                          ? hoveredId === layout.id
                            ? "bg-primary"
                            : "bg-primary/60"
                          : "bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border mt-1 pt-1 px-2">
            <div className="text-[10px] text-muted-foreground py-0.5 font-medium">
              Thirds
            </div>
            <div className="flex gap-1.5 pb-1">
              {LAYOUTS.slice(7).map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => {
                    onSelect(layout.id);
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredId(layout.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-1.5 rounded transition-colors ${
                    hoveredId === layout.id
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-muted"
                  }`}
                  title={layout.label}
                >
                  <div className="grid grid-cols-6 grid-rows-2 gap-px w-8 h-5">
                    {layout.grid.map((active, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${
                          active
                            ? hoveredId === layout.id
                              ? "bg-primary"
                              : "bg-primary/60"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
