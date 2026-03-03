import { useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";

interface DroppableProps {
  appId: string;
  acceptTypes: string[];
}

export function useDesktopDroppable({ appId, acceptTypes }: DroppableProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `droppable-${appId}`,
    data: {
      appId,
      acceptTypes,
    },
  });

  // Check if the current drag type is accepted
  const dragType = active?.data.current?.type as string | undefined;
  const canAccept = dragType && acceptTypes.includes(dragType);
  const isValidDrop = isOver && canAccept;

  return {
    ref: setNodeRef,
    isOver: isValidDrop,
    canAccept,
  };
}

interface DropHandler {
  (type: string, payload: unknown): void;
}

export function useDesktopDropListener(appId: string, handler: DropHandler) {
  const handleDrop = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<{
        type: string;
        payload: unknown;
        targetAppId: string;
      }>;
      const { type, payload, targetAppId } = customEvent.detail;

      if (targetAppId === appId) {
        handler(type, payload);
      }
    },
    [appId, handler],
  );

  useEffect(() => {
    window.addEventListener("desktop-drop", handleDrop);
    return () => {
      window.removeEventListener("desktop-drop", handleDrop);
    };
  }, [handleDrop]);
}
