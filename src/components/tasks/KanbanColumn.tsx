import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { SortableTaskCard } from './SortableTaskCard';

interface KanbanColumnProps {
  id: Task['status'];
  title: string;
  tasks: Task[];
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

const columnColors = {
  todo: 'border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/50',
  in_progress: 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20',
  review: 'border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-900/20',
  done: 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/20',
  cancelled: 'border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/50',
};

export function KanbanColumn({ id, title, tasks, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = tasks.map(task => task.id);

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-t-lg border-t border-x',
        columnColors[id as keyof typeof columnColors]
      )}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">
            {title}
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background/80 text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-3 border-x border-b rounded-b-lg min-h-[400px] transition-colors',
          columnColors[id as keyof typeof columnColors],
          isOver && 'ring-2 ring-primary ring-inset'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
