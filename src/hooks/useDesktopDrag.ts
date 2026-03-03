import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DragData {
  type: string;
  payload: unknown;
  label: string;
  icon?: string;
}

interface DraggableProps {
  id: string;
  data: DragData;
}

export function useDesktopDraggable({ id, data }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return {
    ref: setNodeRef,
    style,
    isDragging,
    dragProps: {
      ...attributes,
      ...listeners,
    },
  };
}
