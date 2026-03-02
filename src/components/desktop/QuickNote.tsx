import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, X } from "lucide-react";
import { useReducedMotion } from "@/lib/reduced-motion";

const STORAGE_KEY = "desktop-quick-note";
const MIN_WIDTH = 250;
const MIN_HEIGHT = 180;

interface QuickNoteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickNote({ isOpen, onClose }: QuickNoteProps) {
  const prefersReducedMotion = useReducedMotion();
  const [content, setContent] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [position, setPosition] = useState({
    x: window.innerWidth - 320,
    y: 80,
  });
  const [size] = useState({ width: 280, height: 240 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Save content to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch {
      // Ignore storage errors
    }
  }, [content]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Drag handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        setPosition({
          x: Math.max(
            0,
            Math.min(
              window.innerWidth - size.width,
              dragRef.current.origX + dx,
            ),
          ),
          y: Math.max(
            28,
            Math.min(window.innerHeight - 60, dragRef.current.origY + dy),
          ),
        });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position, size.width],
  );

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.9, y: -10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: -10 },
        transition: { type: "spring", damping: 20, stiffness: 300 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...motionProps}
          className="fixed z-[55] shadow-2xl rounded-lg border border-border overflow-hidden bg-card/95 backdrop-blur-md"
          style={{
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            minWidth: MIN_WIDTH,
            minHeight: MIN_HEIGHT,
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-1.5">
              <StickyNote className="w-3 h-3 text-yellow-400" />
              <span className="text-[11px] font-medium text-foreground">
                Quick Note
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onClose}
                className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close quick note"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[calc(100%-32px)] p-3 text-sm bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Jot something down..."
            spellCheck={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
