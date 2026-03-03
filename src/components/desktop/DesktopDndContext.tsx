import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "framer-motion";

interface DragData {
  type: string;
  payload: unknown;
  label: string;
  icon?: string;
}

interface DesktopDndContextType {
  dragData: DragData | null;
  isDragging: boolean;
}

const DesktopDndContextValue = createContext<DesktopDndContextType | undefined>(
  undefined,
);

interface DesktopDndContextProps {
  children: ReactNode;
}

export function DesktopDndContext({ children }: DesktopDndContextProps) {
  const [dragData, setDragData] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) {
      setDragData(data);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;

      if (over && dragData) {
        const targetAppId = over.data.current?.appId as string | undefined;
        if (targetAppId) {
          // Dispatch custom event for the drop target to handle
          window.dispatchEvent(
            new CustomEvent("desktop-drop", {
              detail: {
                type: dragData.type,
                payload: dragData.payload,
                targetAppId,
              },
            }),
          );
        }
      }

      setDragData(null);
    },
    [dragData],
  );

  const handleDragCancel = useCallback(() => {
    setDragData(null);
  }, []);

  return (
    <DesktopDndContextValue.Provider
      value={{
        dragData,
        isDragging: dragData !== null,
      }}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {dragData && <DragOverlayCard data={dragData} />}
        </DragOverlay>
      </DndContext>
    </DesktopDndContextValue.Provider>
  );
}

export function useDesktopDndContext() {
  const context = useContext(DesktopDndContextValue);
  if (context === undefined) {
    throw new Error(
      "useDesktopDndContext must be used within a DesktopDndContext",
    );
  }
  return context;
}

interface DragOverlayCardProps {
  data: DragData;
}

function DragOverlayCard({ data }: DragOverlayCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2 pointer-events-none"
    >
      {data.icon && (
        <span className="text-lg flex-shrink-0" role="img" aria-hidden="true">
          {data.icon}
        </span>
      )}
      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
        {data.label}
      </span>
    </motion.div>
  );
}
