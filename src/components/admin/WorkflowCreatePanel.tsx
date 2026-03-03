import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { WorkflowStep } from "./WorkflowStepBuilder";

interface WorkflowCreatePanelProps {
  onClose: () => void;
  onCreate: (workflow: {
    name: string;
    description: string;
    trigger_type: "manual" | "scheduled" | "webhook" | "event";
    trigger_config: Record<string, unknown>;
    steps: WorkflowStep[];
  }) => Promise<void>;
  isCreating: boolean;
}

export default function WorkflowCreatePanel({
  onClose,
  onCreate,
  isCreating,
}: WorkflowCreatePanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<
    "manual" | "scheduled" | "webhook" | "event"
  >("manual");

  const handleCreate = () => {
    if (!name.trim()) return;

    onCreate({
      name,
      description,
      trigger_type: triggerType,
      trigger_config: {},
      steps: [],
    });
  };

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className="flex-none w-full md:w-[45%] bg-card border-l border-border overflow-y-auto max-h-[calc(100vh-8rem)]"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 bg-card border-b border-border px-5 py-4 z-10 flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-lg">New Workflow</h3>
        <button
          onClick={onClose}
          disabled={isCreating}
          className="p-1 hover:bg-muted rounded transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <Tabs defaultValue="scratch">
          <TabsList className="w-full">
            <TabsTrigger value="scratch" className="flex-1">
              From Scratch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scratch" className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workflow"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                placeholder="What does this workflow do?"
                rows={3}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Trigger Type
              </label>
              <select
                value={triggerType}
                onChange={(e) =>
                  setTriggerType(e.target.value as typeof triggerType)
                }
                disabled={isCreating}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="webhook">Webhook</option>
                <option value="event">Event</option>
              </select>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workflow"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
