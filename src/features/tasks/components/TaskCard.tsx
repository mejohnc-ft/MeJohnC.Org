import { Link } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tag,
  User,
  Trash2,
  Edit
} from 'lucide-react';
import { TaskWithCategory } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface TaskCardProps {
  task: TaskWithCategory;
  onDelete?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  isDragging?: boolean;
}

const priorityColors = {
  low: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors = {
  todo: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  done: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
};

function getDueDateDisplay(dueDate: string | null) {
  if (!dueDate) return null;

  const date = new Date(dueDate);
  const isPastDue = isPast(date) && !isToday(date);

  let displayText = '';
  if (isToday(date)) {
    displayText = 'Due today';
  } else if (isTomorrow(date)) {
    displayText = 'Due tomorrow';
  } else if (isPastDue) {
    displayText = `Overdue ${format(date, 'MMM d')}`;
  } else {
    displayText = `Due ${format(date, 'MMM d')}`;
  }

  return {
    text: displayText,
    isPastDue,
  };
}

export function TaskCard({ task, onDelete, onEdit, isDragging }: TaskCardProps) {
  const dueDateInfo = getDueDateDisplay(task.due_date);

  return (
    <div
      className={cn(
        'group bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all',
        isDragging && 'opacity-50 rotate-2',
        task.is_overdue && 'border-red-500/50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            to={`/admin/tasks/${task.id}`}
            className="block font-medium text-foreground hover:text-primary line-clamp-2"
          >
            {task.title}
          </Link>
          {task.category && (
            <div className="flex items-center gap-1 mt-1">
              <Tag className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{task.category.name}</span>
            </div>
          )}
        </div>

        {/* Priority Badge */}
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap', priorityColors[task.priority])}>
          {task.priority}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
        {/* Due Date */}
        {dueDateInfo && (
          <div className={cn(
            'flex items-center gap-1',
            dueDateInfo.isPastDue && 'text-red-600 dark:text-red-400 font-medium'
          )}>
            {dueDateInfo.isPastDue ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Calendar className="w-3 h-3" />
            )}
            <span>{dueDateInfo.text}</span>
          </div>
        )}

        {/* Assigned To */}
        {task.assigned_to && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{task.assigned_to}</span>
          </div>
        )}

        {/* Completed */}
        {task.status === 'done' && task.completed_at && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed {format(new Date(task.completed_at), 'MMM d')}</span>
          </div>
        )}

        {/* Created */}
        {task.status !== 'done' && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Created {format(new Date(task.created_at), 'MMM d')}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(task.id)}
            className="h-7 text-xs"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(task.id)}
            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>

        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', statusColors[task.status])}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
