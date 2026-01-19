import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableComponent } from './SortableComponent';
import type { SiteBuilderPageComponent } from '@/lib/schemas';
import { BLOCK_COMPONENTS } from './blocks';

export interface PageCanvasProps {
  components: SiteBuilderPageComponent[];
  onReorder: (components: SiteBuilderPageComponent[]) => void;
  onSelectComponent: (component: SiteBuilderPageComponent | null) => void;
  selectedComponent: SiteBuilderPageComponent | null;
  onDeleteComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
}

export function PageCanvas({
  components,
  onReorder,
  onSelectComponent,
  selectedComponent,
  onDeleteComponent,
  onDuplicateComponent,
}: PageCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const componentIds = useMemo(() => components.map((c) => c.id), [components]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);

      const reorderedComponents = arrayMove(components, oldIndex, newIndex).map((c, index) => ({
        ...c,
        order_index: index,
      }));

      onReorder(reorderedComponents);
    }
  };

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/20 border-2 border-dashed border-border rounded-lg">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">No components yet</p>
          <p className="text-sm text-muted-foreground">
            Add components from the sidebar to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={componentIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {components.map((component) => (
            <SortableComponent
              key={component.id}
              component={component}
              isSelected={selectedComponent?.id === component.id}
              onSelect={() => onSelectComponent(component)}
              onDelete={() => onDeleteComponent(component.id)}
              onDuplicate={() => onDuplicateComponent(component.id)}
            >
              {renderComponent(component)}
            </SortableComponent>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function renderComponent(component: SiteBuilderPageComponent) {
  const Component = BLOCK_COMPONENTS[component.component_type as keyof typeof BLOCK_COMPONENTS];

  if (!Component) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded">
        Unknown component type: {component.component_type}
      </div>
    );
  }

  return <Component {...(component.props as Record<string, unknown>)} />;
}
