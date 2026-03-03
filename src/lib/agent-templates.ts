export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "sales"
    | "content"
    | "support"
    | "development"
    | "operations"
    | "analytics";
  type: "autonomous" | "supervised" | "tool";
  system_prompt: string;
  capabilities: string[];
  model: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind class
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "customer-success",
    name: "Customer Success Agent",
    description:
      "Monitors NPS scores, follows up with detractors, and tracks customer health metrics.",
    category: "sales",
    type: "supervised",
    system_prompt:
      "You are a customer success agent. Monitor NPS scores and customer health. When a detractor is identified (NPS < 7), draft a personalized follow-up email. Escalate critical issues to the team.",
    capabilities: ["crm_read", "email_send", "task_create"],
    model: "claude-sonnet-4-5-20250929",
    icon: "HeartHandshake",
    color: "text-pink-500",
  },
  {
    id: "code-reviewer",
    name: "Code Review Agent",
    description:
      "Reviews pull requests, suggests improvements, and checks for common issues.",
    category: "development",
    type: "autonomous",
    system_prompt:
      "You are a code review agent. When triggered, review the provided code changes for bugs, security issues, performance problems, and style inconsistencies. Provide specific, actionable feedback.",
    capabilities: ["github_read", "comment_create"],
    model: "claude-opus-4-6",
    icon: "GitPullRequest",
    color: "text-orange-500",
  },
  {
    id: "content-writer",
    name: "Content Writer Agent",
    description:
      "Drafts blog posts, social media content, and marketing copy from prompts.",
    category: "content",
    type: "supervised",
    system_prompt:
      "You are a content writing agent. Generate high-quality blog posts, social media content, and marketing copy. Match the brand voice and ensure SEO best practices. Always provide drafts for human review before publishing.",
    capabilities: ["blog_write", "prompt_read"],
    model: "claude-sonnet-4-5-20250929",
    icon: "PenTool",
    color: "text-emerald-500",
  },
  {
    id: "data-analyst",
    name: "Data Analyst Agent",
    description:
      "Queries metrics, generates reports, and surfaces insights from business data.",
    category: "analytics",
    type: "autonomous",
    system_prompt:
      "You are a data analyst agent. Query business metrics, identify trends, and generate weekly reports. Flag anomalies and provide actionable recommendations.",
    capabilities: ["metrics_read", "report_generate"],
    model: "claude-sonnet-4-5-20250929",
    icon: "BarChart3",
    color: "text-blue-500",
  },
  {
    id: "ticket-router",
    name: "Support Ticket Router",
    description:
      "Automatically categorizes and routes incoming support tickets to the right team.",
    category: "support",
    type: "autonomous",
    system_prompt:
      "You are a support ticket routing agent. Analyze incoming tickets, categorize them (bug, feature request, billing, general), assess priority (P1-P4), and route to the appropriate team member. Respond with an acknowledgment to the customer.",
    capabilities: ["task_create", "email_send", "crm_read"],
    model: "claude-haiku-4-5-20251001",
    icon: "Route",
    color: "text-cyan-500",
  },
  {
    id: "standup-summarizer",
    name: "Daily Standup Summarizer",
    description:
      "Compiles daily standup notes from task activity and sends a team summary.",
    category: "operations",
    type: "autonomous",
    system_prompt:
      "You are a daily standup summarizer. Every morning, review task activity from the past 24 hours. Compile a concise summary of what was done, what's in progress, and any blockers. Send the summary to the team channel.",
    capabilities: ["task_read", "email_send", "notification_send"],
    model: "claude-haiku-4-5-20251001",
    icon: "ListChecks",
    color: "text-amber-500",
  },
  {
    id: "seo-optimizer",
    name: "SEO Optimizer Agent",
    description:
      "Analyzes blog posts for SEO, suggests title/meta improvements, and tracks rankings.",
    category: "content",
    type: "tool",
    system_prompt:
      "You are an SEO optimization agent. Analyze blog post content for keyword optimization, readability, meta descriptions, heading structure, and internal linking opportunities. Provide specific suggestions with before/after examples.",
    capabilities: ["blog_read", "metrics_read"],
    model: "claude-sonnet-4-5-20250929",
    icon: "Search",
    color: "text-green-500",
  },
  {
    id: "infra-monitor",
    name: "Infrastructure Monitor",
    description:
      "Monitors infrastructure health, alerts on downtime, and tracks cost anomalies.",
    category: "operations",
    type: "autonomous",
    system_prompt:
      "You are an infrastructure monitoring agent. Periodically check the health of all infrastructure nodes. Alert on status changes, cost spikes (>20% increase), or unreachable endpoints. Provide incident summaries.",
    capabilities: ["infrastructure_read", "notification_send", "task_create"],
    model: "claude-haiku-4-5-20251001",
    icon: "Shield",
    color: "text-red-500",
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "sales" as const, label: "Sales", icon: "TrendingUp" },
  { id: "content" as const, label: "Content", icon: "FileText" },
  { id: "support" as const, label: "Support", icon: "LifeBuoy" },
  { id: "development" as const, label: "Development", icon: "Code" },
  { id: "operations" as const, label: "Operations", icon: "Settings" },
  { id: "analytics" as const, label: "Analytics", icon: "BarChart3" },
] as const;
