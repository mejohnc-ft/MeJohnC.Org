import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteBuilderPageComponent } from '@/lib/schemas';

export interface SortableComponentProps {
  component: SiteBuilderPageComponent;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  children: React.ReactNode;
}

export function SortableComponent({
  component,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  children,
}: SortableComponentProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: component.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative border-2 rounded-lg transition-all',
        {
          'border-primary bg-primary/5': isSelected,
          'border-transparent hover:border-border': !isSelected,
          'opacity-50': isDragging,
        }
      )}
      onClick={onSelect}
    >
      {/* Controls */}
      <div
        className={cn(
          'absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity',
          {
            'opacity-100': isSelected,
          }
        )}
      >
        <button
          type="button"
          className="p-2 bg-background border border-border rounded hover:bg-accent transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 bg-background border border-border rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this component?')) {
              onDelete();
            }
          }}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute top-2 left-2 z-10 p-2 bg-background border border-border rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity',
          {
            'opacity-100': isSelected,
          }
        )}
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Component Content */}
      <div className="pointer-events-none">{children}</div>
    </div>
  );
}
