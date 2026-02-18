/**
 * FollowUpList Component
 *
 * Displays a list of follow-ups with status indicators
 */

import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantSupabase } from "@/lib/supabase";
import { createTask } from "@/lib/task-queries";
import { toast } from "sonner";
import type { FollowUp } from "../schemas";

interface FollowUpListProps {
  followUps: FollowUp[];
  onComplete?: (id: string) => void;
  contactName?: string;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  normal: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  low: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

export function FollowUpList({
  followUps,
  onComplete,
  contactName,
}: FollowUpListProps) {
  const navigate = useNavigate();
  const { supabase, tenantId } = useTenantSupabase();

  const handleCreateTask = async (followUp: FollowUp) => {
    if (!supabase || !tenantId) return;
    try {
      const task = await createTask(
        {
          title: `Follow up: ${followUp.title}`,
          description:
            followUp.description ||
            `CRM follow-up${contactName ? ` for ${contactName}` : ""}`,
          status: "todo",
          priority:
            followUp.priority === "urgent"
              ? "urgent"
              : followUp.priority === "high"
                ? "high"
                : "medium",
          due_date: followUp.due_at,
          tags: ["crm-follow-up"],
          assigned_to: null,
          assigned_to_email: null,
          category_id: null,
          attachments: [],
          metadata: {
            source: "crm_follow_up",
            follow_up_id: followUp.id,
            contact_id: followUp.contact_id,
          },
          sort_order: 0,
          parent_task_id: null,
          created_by: "system",
          created_by_email: "system",
          tenant_id: tenantId,
        },
        supabase,
      );
      toast.success("Task created from follow-up");
      navigate(`/admin/tasks/${task.id}`);
    } catch {
      toast.error("Failed to create task");
    }
  };

  if (followUps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No follow-ups scheduled
      </div>
    );
  }

  const now = new Date().toISOString();

  return (
    <div className="space-y-2">
      {followUps.map((followUp) => {
        const isOverdue =
          followUp.status === "pending" && followUp.due_at < now;
        const isCompleted = followUp.status === "completed";

        return (
          <div
            key={followUp.id}
            className={`flex items-center justify-between p-4 bg-card border rounded-lg ${
              isOverdue ? "border-red-500/20 bg-red-500/5" : "border-border"
            } ${isCompleted ? "opacity-60" : ""}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : isOverdue ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
                <h4 className="font-medium text-foreground">
                  {followUp.title}
                </h4>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(followUp.due_at).toLocaleString()}
                </span>
                <Badge
                  variant="outline"
                  className={priorityColors[followUp.priority]}
                >
                  {followUp.priority}
                </Badge>
                <Badge variant="outline">{followUp.follow_up_type}</Badge>
                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>

              {followUp.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {followUp.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {followUp.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateTask(followUp)}
                  title="Create a task from this follow-up"
                >
                  <ListTodo className="w-4 h-4 mr-1" />
                  Task
                </Button>
              )}
              {followUp.status === "pending" && onComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete(followUp.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
