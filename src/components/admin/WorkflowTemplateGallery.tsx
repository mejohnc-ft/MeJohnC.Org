import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, Clock, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  WORKFLOW_TEMPLATES,
  WORKFLOW_CATEGORIES,
  type WorkflowTemplate,
} from "@/lib/workflow-templates";

interface WorkflowTemplateGalleryProps {
  onInstall: (template: WorkflowTemplate) => void;
}

export default function WorkflowTemplateGallery({
  onInstall,
}: WorkflowTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = WORKFLOW_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case "trigger":
        return "⚡";
      case "action":
        return "▶";
      case "condition":
        return "◆";
      case "delay":
        return "⏱";
      default:
        return "●";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Category Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {WORKFLOW_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No templates found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or category filter
          </p>
        </motion.div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length > 0 && (
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          }}
        >
          {filteredTemplates.map((template, index) => {
            const Icon = template.icon;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:border-primary/50 transition-colors h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`p-3 rounded-lg bg-primary/10 ${template.color}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {template.category}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>{template.steps.length} steps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{template.estimatedSetup}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < template.popularity
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Step Flow Preview */}
                  <div className="mb-4 flex-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Workflow Steps:
                    </div>
                    <div className="space-y-1.5">
                      {template.steps.slice(0, 4).map((step) => (
                        <div key={step.id} className="flex items-start gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs opacity-60">
                              {getStepTypeIcon(step.type)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-foreground truncate">
                                {step.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {step.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {template.steps.length > 4 && (
                        <div className="text-[10px] text-muted-foreground pl-5">
                          +{template.steps.length - 4} more steps
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Flow Dots */}
                  <div className="flex items-center gap-1 mb-4">
                    {template.steps.slice(0, 8).map((step, idx) => {
                      const color =
                        {
                          trigger: "bg-yellow-500",
                          action: "bg-blue-500",
                          condition: "bg-purple-500",
                          delay: "bg-orange-500",
                        }[step.type] || "bg-gray-500";

                      return (
                        <div key={step.id} className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full ${color}`}
                            title={step.name}
                          />
                          {idx < Math.min(template.steps.length - 1, 7) && (
                            <div className="w-3 h-px bg-border" />
                          )}
                        </div>
                      );
                    })}
                    {template.steps.length > 8 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        +{template.steps.length - 8}
                      </span>
                    )}
                  </div>

                  {/* Install Button */}
                  <Button
                    onClick={() => onInstall(template)}
                    className="w-full"
                    variant="default"
                  >
                    Install Template
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
