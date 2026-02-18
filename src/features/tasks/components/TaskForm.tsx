import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Task, TaskCategory, Contact } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Plus, Bot, Users, Briefcase } from "lucide-react";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { getAgentsList } from "@/lib/workflows-queries";
import { getContacts } from "@/lib/crm-queries";
import { AgentListItem } from "@/lib/workflows-schemas";

interface TaskFormProps {
  task?: Task;
  categories: TaskCategory[];
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({
  task,
  categories,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { user } = useUser();
  const { supabase } = useAuthenticatedSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assignMode, setAssignMode] = useState<"manual" | "agent">("manual");
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    category_id: task?.category_id || "",
    status: task?.status || "todo",
    priority: task?.priority || "medium",
    assigned_to: task?.assigned_to || "",
    assigned_to_email: task?.assigned_to_email || "",
    due_date: task?.due_date
      ? new Date(task.due_date).toISOString().split("T")[0]
      : "",
    tags: task?.tags || [],
    metadata: task?.metadata || {},
  });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        category_id: task.category_id || "",
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || "",
        assigned_to_email: task.assigned_to_email || "",
        due_date: task.due_date
          ? new Date(task.due_date).toISOString().split("T")[0]
          : "",
        tags: task.tags || [],
        metadata: task.metadata || {},
      });
      // Detect if assigned to an agent
      const meta = task.metadata as Record<string, unknown> | null;
      if (meta?.agent_id) {
        setAssignMode("agent");
      }
    }
  }, [task]);

  useEffect(() => {
    if (supabase) {
      getAgentsList(supabase)
        .then(setAgents)
        .catch(() => {});
      getContacts({ limit: 100 }, supabase)
        .then(setContacts)
        .catch(() => {});
    }
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData: Partial<Task> = {
        ...formData,
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : null,
        category_id: formData.category_id || null,
      };

      if (!task) {
        submitData.created_by = user?.id || "unknown";
        submitData.created_by_email =
          user?.primaryEmailAddress?.emailAddress || "unknown";
        submitData.sort_order = 0;
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleAgentAssign = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setFormData({
        ...formData,
        assigned_to: `[Agent] ${agent.name}`,
        assigned_to_email: "",
        metadata: {
          ...formData.metadata,
          agent_id: agent.id,
          agent_type: agent.type,
        },
      });
    } else {
      setFormData({
        ...formData,
        assigned_to: "",
        assigned_to_email: "",
        metadata: { ...formData.metadata, agent_id: null, agent_type: null },
      });
    }
  };

  const handleContactLink = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    setFormData({
      ...formData,
      metadata: {
        ...formData.metadata,
        linked_contact_id: contactId || null,
        linked_contact_name: contact
          ? `${contact.first_name} ${contact.last_name}`
          : null,
      },
    });
  };

  const meta = formData.metadata as Record<string, unknown>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <Input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Task title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Task description"
          rows={4}
          className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Category & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="category_id"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Category
          </label>
          <select
            id="category_id"
            value={formData.category_id}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value })
            }
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as Task["status"],
              })
            }
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Priority & Due Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as Task["priority"],
              })
            }
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Due Date
          </label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) =>
              setFormData({ ...formData, due_date: e.target.value })
            }
          />
        </div>
      </div>

      {/* Assignment */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <label className="block text-sm font-medium text-foreground">
            Assign To
          </label>
          <div className="flex rounded-md border border-input overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setAssignMode("manual")}
              className={`px-3 py-1 flex items-center gap-1.5 ${
                assignMode === "manual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Person
            </button>
            <button
              type="button"
              onClick={() => setAssignMode("agent")}
              className={`px-3 py-1 flex items-center gap-1.5 border-l border-input ${
                assignMode === "agent"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Agent
            </button>
          </div>
        </div>

        {assignMode === "manual" ? (
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              value={formData.assigned_to}
              onChange={(e) =>
                setFormData({ ...formData, assigned_to: e.target.value })
              }
              placeholder="Name"
            />
            <Input
              type="email"
              value={formData.assigned_to_email}
              onChange={(e) =>
                setFormData({ ...formData, assigned_to_email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </div>
        ) : (
          <select
            value={(meta?.agent_id as string) || ""}
            onChange={(e) => handleAgentAssign(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select an agent...</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.type})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* CRM Link */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          Link to CRM Contact
        </label>
        <select
          value={(meta?.linked_contact_id as string) || ""}
          onChange={(e) => handleContactLink(e.target.value)}
          className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">None</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.first_name} {contact.last_name}
              {contact.company ? ` (${contact.company})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag"
          />
          <Button
            type="button"
            onClick={handleAddTag}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.title}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : task ? (
            "Update Task"
          ) : (
            "Create Task"
          )}
        </Button>
      </div>
    </form>
  );
}
