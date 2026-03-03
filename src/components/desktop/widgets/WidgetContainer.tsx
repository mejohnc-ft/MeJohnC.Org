import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

interface WidgetContainerProps {
  id: string;
  title: string;
  defaultPosition: { x: number; y: number };
  size: { width: number; height: number };
  children: React.ReactNode;
}

export default function WidgetContainer({
  id,
  title,
  defaultPosition,
  size,
  children,
}: WidgetContainerProps) {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(`widget-position-${id}`);
    return saved ? JSON.parse(saved) : defaultPosition;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(`widget-position-${id}`, JSON.stringify(position));
  }, [id, position]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      setPosition({
        x: dragRef.current.startPosX + deltaX,
        y: dragRef.current.startPosY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute backdrop-blur-md bg-card/30 border border-white/10 rounded-xl shadow-lg overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 50,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Drag Handle */}
      <div
        className="h-6 px-2 flex items-center gap-1.5 border-b border-white/5 cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-xs font-medium text-muted-foreground/70 select-none">
          {title}
        </span>
      </div>

      {/* Widget Content */}
      <div className="p-3 h-[calc(100%-24px)] overflow-hidden">{children}</div>
    </motion.div>
  );
}
