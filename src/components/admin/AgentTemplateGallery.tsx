import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  TrendingUp,
  FileText,
  LifeBuoy,
  Code,
  Settings,
  BarChart3,
  HeartHandshake,
  GitPullRequest,
  PenTool,
  Route,
  ListChecks,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type AgentTemplate,
} from "@/lib/agent-templates";

interface AgentTemplateGalleryProps {
  onDeploy: (template: AgentTemplate) => void;
  deploying?: boolean;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HeartHandshake,
  GitPullRequest,
  PenTool,
  BarChart3,
  Route,
  ListChecks,
  Search,
  Shield,
  TrendingUp,
  FileText,
  LifeBuoy,
  Code,
  Settings,
};

function TypeBadge({ type }: { type: AgentTemplate["type"] }) {
  const variants: Record<AgentTemplate["type"], string> = {
    autonomous: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    supervised: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    tool: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  };

  return (
    <Badge className={`${variants[type]} text-[10px] font-medium`}>
      {type}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: AgentTemplate["category"] }) {
  const variants: Record<AgentTemplate["category"], string> = {
    sales: "bg-pink-500/10 text-pink-500 border-pink-500/30",
    content: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    support: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    development: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    operations: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    analytics: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  };

  return (
    <Badge className={`${variants[category]} text-[10px] font-medium`}>
      {category}
    </Badge>
  );
}

export default function AgentTemplateGallery({
  onDeploy,
  deploying = false,
}: AgentTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    AgentTemplate["category"] | "all"
  >("all");

  // Filter templates
  const filteredTemplates = AGENT_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Agent Templates</h2>
          <p className="text-sm text-muted-foreground">
            Deploy pre-configured agents in one click
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {TEMPLATE_CATEGORIES.map((category) => {
              const Icon = iconMap[category.icon];
              return (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    categoryFilter === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Templates grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => {
            const Icon = iconMap[template.icon];
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 h-full flex flex-col backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {Icon && (
                      <div
                        className={`p-2 rounded-lg bg-muted/50 ${template.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight mb-1 truncate">
                        {template.name}
                      </h3>
                      <div className="flex gap-1.5">
                        <TypeBadge type={template.type} />
                        <CategoryBadge category={template.category} />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                    {template.description}
                  </p>

                  {/* Capabilities */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      Capabilities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.capabilities.map((cap) => (
                        <Badge
                          key={cap}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Model */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Model</p>
                    <p className="text-xs font-mono truncate">
                      {template.model}
                    </p>
                  </div>

                  {/* Deploy button */}
                  <Button
                    onClick={() => onDeploy(template)}
                    disabled={deploying}
                    className="w-full"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Deploy Agent
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
