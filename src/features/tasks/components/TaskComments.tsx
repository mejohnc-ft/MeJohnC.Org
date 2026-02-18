import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Trash2,
  Pencil,
  X,
  Check,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
} from "@/lib/task-queries";
import { TaskComment, DEFAULT_TENANT_ID } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user } = useUser();
  const { supabase } = useAuthenticatedSupabase();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (supabase && taskId) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, taskId]);

  async function loadComments() {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const data = await getTaskComments(taskId, supabase);
      setComments(data);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await createTaskComment(
        {
          tenant_id: DEFAULT_TENANT_ID,
          task_id: taskId,
          comment: newComment.trim(),
          author: user?.fullName || user?.id || "Unknown",
          author_email: user?.primaryEmailAddress?.emailAddress || "",
          is_internal: isInternal,
          attachments: [],
        },
        supabase,
      );
      setComments([...comments, comment]);
      setNewComment("");
      setIsInternal(false);
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateComment(id: string) {
    if (!supabase || !editText.trim()) return;

    try {
      const updated = await updateTaskComment(
        id,
        { comment: editText.trim() },
        supabase,
      );
      setComments(comments.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      setEditText("");
    } catch {
      toast.error("Failed to update comment");
    }
  }

  async function handleDeleteComment(id: string) {
    if (!supabase) return;

    try {
      await deleteTaskComment(id, supabase);
      setComments(comments.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  function startEditing(comment: TaskComment) {
    setEditingId(comment.id);
    setEditText(comment.comment);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "rounded-lg border p-3",
                comment.is_internal
                  ? "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    {comment.author}
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                  {comment.is_internal && (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                      <Lock className="w-3 h-3" />
                      Internal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(comment)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-muted-foreground hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingId === comment.id ? (
                <div className="flex gap-2 mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={2}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleUpdateComment(comment.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText("");
                      }}
                      className="p-1.5 text-muted-foreground hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleAddComment} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-input"
            />
            <Lock className="w-3.5 h-3.5" />
            Internal note
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !newComment.trim()}
          >
            <Send className="w-4 h-4 mr-1" />
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
