import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, Plus, Trash2, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getTaskReminders,
  createTaskReminder,
  deleteTaskReminder,
} from "@/lib/task-queries";
import { TaskReminder, DEFAULT_TENANT_ID } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TaskRemindersProps {
  taskId: string;
}

export function TaskReminders({ taskId }: TaskRemindersProps) {
  const { supabase } = useAuthenticatedSupabase();
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderType, setReminderType] = useState<
    "email" | "notification" | "both"
  >("notification");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supabase && taskId) {
      loadReminders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, taskId]);

  async function loadReminders() {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const data = await getTaskReminders(taskId, supabase);
      setReminders(data);
    } catch {
      toast.error("Failed to load reminders");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !reminderDate) return;

    setIsSubmitting(true);
    try {
      const reminderAt = new Date(
        `${reminderDate}T${reminderTime}`,
      ).toISOString();
      const reminder = await createTaskReminder(
        {
          tenant_id: DEFAULT_TENANT_ID,
          task_id: taskId,
          reminder_at: reminderAt,
          reminder_type: reminderType,
        },
        supabase,
      );
      setReminders([...reminders, reminder]);
      setShowForm(false);
      setReminderDate("");
      setReminderTime("09:00");
      setReminderType("notification");
    } catch {
      toast.error("Failed to create reminder");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteReminder(id: string) {
    if (!supabase) return;

    try {
      await deleteTaskReminder(id, supabase);
      setReminders(reminders.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to delete reminder");
    }
  }

  const typeLabels = {
    email: "Email",
    notification: "Notification",
    both: "Both",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Reminders {reminders.length > 0 && `(${reminders.length})`}
          </h3>
        </div>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Reminder
          </Button>
        )}
      </div>

      {/* Reminder list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reminders...</p>
      ) : reminders.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">No reminders set.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => {
            const isPast = new Date(reminder.reminder_at) < new Date();
            return (
              <div
                key={reminder.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3",
                  reminder.is_sent
                    ? "border-green-500/30 bg-green-50/50 dark:bg-green-900/10"
                    : isPast
                      ? "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10"
                      : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-3">
                  {reminder.is_sent ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(
                        new Date(reminder.reminder_at),
                        "MMM d, yyyy h:mm a",
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[reminder.reminder_type]}
                      {reminder.is_sent && reminder.sent_at && (
                        <>
                          {" "}
                          &middot; Sent{" "}
                          {format(new Date(reminder.sent_at), "MMM d, h:mm a")}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="p-1 text-muted-foreground hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add reminder form */}
      {showForm && (
        <form
          onSubmit={handleAddReminder}
          className="space-y-3 border border-border rounded-lg p-4 bg-card"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date
              </label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Time
              </label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Type
            </label>
            <select
              value={reminderType}
              onChange={(e) =>
                setReminderType(e.target.value as typeof reminderType)
              }
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="notification">Notification</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !reminderDate}
            >
              {isSubmitting ? "Adding..." : "Add Reminder"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
