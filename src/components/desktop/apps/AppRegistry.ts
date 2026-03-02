import { lazy, ComponentType } from "react";
import { type PlanTier, planMeetsMinimum } from "@/lib/billing";

export type AppCategory =
  | "content"
  | "ai"
  | "management"
  | "platform"
  | "agents"
  | "system";

export interface DesktopApp {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  category: AppCategory;
  component: () => Promise<{ default: ComponentType }>;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  singleton: boolean;
  defaultDockPinned: boolean;
  route?: string; // Original admin route (for context)
  minPlan?: PlanTier; // Minimum plan required (omit = free)
}

// Lazy component factories — reusing the same imports as App.tsx
const apps: DesktopApp[] = [
  // Dashboard (pinned)
  {
    id: "dashboard",
    name: "Dashboard",
    icon: "LayoutDashboard",
    color: "text-blue-500",
    category: "system",
    component: () => import("@/pages/admin/Dashboard"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: "/admin",
  },

  // Content
  {
    id: "blog",
    name: "Blog",
    icon: "FileText",
    color: "text-emerald-500",
    category: "content",
    component: () => import("@/pages/admin/blog/index"),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 500, height: 350 },
    singleton: true,
    defaultDockPinned: true,
    route: "/admin/blog",
    minPlan: "starter",
  },
  {
    id: "news",
    name: "News",
    icon: "Newspaper",
    color: "text-orange-500",
    category: "content",
    component: () => import("@/features/news/pages/FeedPage"),
    defaultSize: { width: 800, height: 550 },
    minSize: { width: 500, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/news",
    minPlan: "starter",
  },
  {
    id: "bookmarks",
    name: "Bookmarks",
    icon: "Bookmark",
    color: "text-yellow-500",
    category: "content",
    component: () => import("@/pages/admin/bookmarks/index"),
    defaultSize: { width: 750, height: 550 },
    minSize: { width: 450, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/bookmarks",
    minPlan: "starter",
  },

  // AI Tools
  {
    id: "ai-manager",
    name: "AI Manager",
    icon: "Sparkles",
    color: "text-purple-500",
    category: "ai",
    component: () => import("@/pages/admin/ai-manager/index"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: "/admin/ai-manager",
    minPlan: "business",
  },
  {
    id: "prompts",
    name: "Prompts",
    icon: "BookText",
    color: "text-violet-500",
    category: "ai",
    component: () => import("@/pages/admin/PromptLibrary"),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/prompts",
    minPlan: "business",
  },
  {
    id: "skills",
    name: "Skills",
    icon: "Wrench",
    color: "text-cyan-500",
    category: "ai",
    component: () => import("@/pages/admin/SkillsRegistry"),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/skills",
    minPlan: "business",
  },
  {
    id: "runbooks",
    name: "Runbooks",
    icon: "BookOpen",
    color: "text-teal-500",
    category: "ai",
    component: () => import("@/pages/admin/Runbooks"),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/runbooks",
    minPlan: "business",
  },

  // Management
  {
    id: "tasks",
    name: "Tasks",
    icon: "CheckSquare",
    color: "text-green-500",
    category: "management",
    component: () => import("@/features/tasks/pages/TasksPage"),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: "/admin/tasks",
    minPlan: "starter",
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "Calendar",
    color: "text-sky-500",
    category: "management",
    component: () => import("@/features/calendar/pages/CalendarPage"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 450 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/calendar",
    minPlan: "business",
  },
  {
    id: "crm",
    name: "CRM",
    icon: "Users",
    color: "text-blue-400",
    category: "management",
    component: () => import("@/features/crm/pages/ContactsPage"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/crm",
    minPlan: "business",
  },
  {
    id: "projects",
    name: "Projects",
    icon: "FolderKanban",
    color: "text-indigo-500",
    category: "management",
    component: () => import("@/pages/admin/projects/index"),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/projects",
    minPlan: "starter",
  },
  {
    id: "apps",
    name: "Apps",
    icon: "AppWindow",
    color: "text-pink-500",
    category: "management",
    component: () => import("@/pages/admin/apps/index"),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/apps",
    minPlan: "business",
  },
  {
    id: "metrics",
    name: "Metrics",
    icon: "BarChart3",
    color: "text-amber-500",
    category: "management",
    component: () => import("@/features/metrics/pages/DashboardPage"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/metrics",
    minPlan: "business",
  },

  // Platform
  {
    id: "infrastructure",
    name: "Infrastructure",
    icon: "Server",
    color: "text-gray-500",
    category: "platform",
    component: () => import("@/pages/admin/InfrastructureMap"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 450 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/infrastructure",
    minPlan: "business",
  },
  {
    id: "apis",
    name: "APIs",
    icon: "Cable",
    color: "text-rose-500",
    category: "platform",
    component: () => import("@/pages/admin/ApiRegistry"),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/apis",
    minPlan: "business",
  },
  {
    id: "configs",
    name: "Configs",
    icon: "FileCode2",
    color: "text-slate-500",
    category: "platform",
    component: () => import("@/pages/admin/ConfigVault"),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/configs",
    minPlan: "business",
  },

  // Agent Platform
  {
    id: "agents",
    name: "Agents",
    icon: "Bot",
    color: "text-orange-600",
    category: "agents",
    component: () => import("@/pages/admin/AgentRegistry"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: "/admin/agents",
    minPlan: "business",
  },
  {
    id: "workflows",
    name: "Workflows",
    icon: "GitBranch",
    color: "text-fuchsia-500",
    category: "agents",
    component: () => import("@/pages/admin/Workflows"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 450 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/workflows",
    minPlan: "business",
  },
  {
    id: "scheduler",
    name: "Scheduler",
    icon: "Clock",
    color: "text-sky-500",
    category: "agents",
    component: () => import("@/pages/admin/Scheduler"),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/scheduler",
    minPlan: "business",
  },
  {
    id: "integrations",
    name: "Integrations",
    icon: "Plug",
    color: "text-lime-500",
    category: "agents",
    component: () => import("@/pages/admin/IntegrationHub"),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/integrations",
    minPlan: "business",
  },
  {
    id: "tool-definitions",
    name: "Tools",
    icon: "Hammer",
    color: "text-amber-500",
    category: "agents",
    component: () => import("@/pages/admin/ToolDefinitions"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/tool-definitions",
    minPlan: "business",
  },
  {
    id: "audit",
    name: "Audit Log",
    icon: "FileSearch",
    color: "text-stone-500",
    category: "agents",
    component: () => import("@/pages/admin/AuditLog"),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/audit",
    minPlan: "professional",
  },

  // Terminal
  {
    id: "terminal",
    name: "Terminal",
    icon: "Terminal",
    color: "text-green-400",
    category: "system",
    component: () => import("@/components/desktop/apps/TerminalApp"),
    defaultSize: { width: 700, height: 450 },
    minSize: { width: 400, height: 300 },
    singleton: false,
    defaultDockPinned: false,
  },

  // Notes
  {
    id: "notes",
    name: "Notes",
    icon: "StickyNote",
    color: "text-yellow-400",
    category: "system",
    component: () => import("@/components/desktop/apps/NotesApp"),
    defaultSize: { width: 750, height: 500 },
    minSize: { width: 500, height: 350 },
    singleton: true,
    defaultDockPinned: false,
  },

  // System Monitor
  {
    id: "system-monitor",
    name: "Monitor",
    icon: "Activity",
    color: "text-green-500",
    category: "system",
    component: () => import("@/components/desktop/apps/SystemMonitorApp"),
    defaultSize: { width: 500, height: 550 },
    minSize: { width: 400, height: 400 },
    singleton: true,
    defaultDockPinned: false,
  },

  // File System
  {
    id: "file-explorer",
    name: "Files",
    icon: "FolderOpen",
    color: "text-blue-400",
    category: "system",
    component: () => import("@/components/desktop/apps/FileExplorer"),
    defaultSize: { width: 800, height: 550 },
    minSize: { width: 500, height: 350 },
    singleton: false,
    defaultDockPinned: true,
    route: undefined,
  },

  // Wallpaper Picker
  {
    id: "wallpaper-picker",
    name: "Wallpaper",
    icon: "Palette",
    color: "text-pink-400",
    category: "system",
    component: () => import("@/components/desktop/WallpaperPicker"),
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 400, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: undefined,
  },

  // System
  {
    id: "settings",
    name: "Settings",
    icon: "Settings",
    color: "text-gray-400",
    category: "system",
    component: () => import("@/pages/admin/Settings"),
    defaultSize: { width: 750, height: 550 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/settings",
  },
  {
    id: "profile",
    name: "Profile",
    icon: "User",
    color: "text-blue-300",
    category: "system",
    component: () => import("@/pages/admin/Profile"),
    defaultSize: { width: 700, height: 500 },
    minSize: { width: 450, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: "/admin/profile",
  },
];

/** All registered desktop apps */
export const appRegistry = apps;

/** Get an app by its ID */
export function getApp(id: string): DesktopApp | undefined {
  return apps.find((a) => a.id === id);
}

/** Get apps pinned to dock by default */
export function getDefaultDockApps(): DesktopApp[] {
  return apps.filter((a) => a.defaultDockPinned);
}

/** Get apps grouped by category */
export function getAppsByCategory(): Record<AppCategory, DesktopApp[]> {
  const grouped: Record<AppCategory, DesktopApp[]> = {
    content: [],
    ai: [],
    management: [],
    platform: [],
    agents: [],
    system: [],
  };
  for (const app of apps) {
    grouped[app.category].push(app);
  }
  return grouped;
}

/** Get apps available for a given plan tier */
export function getAppsForPlan(plan: PlanTier): DesktopApp[] {
  return apps.filter(
    (app) => !app.minPlan || planMeetsMinimum(plan, app.minPlan),
  );
}

/**
 * Get apps available for a tenant, considering both plan tier and
 * the tenant's enabled_apps whitelist from settings.
 *
 * If enabledAppIds is null/undefined, all plan-eligible apps are returned.
 * System-category apps (settings, profile, file-explorer, wallpaper) are
 * never filtered out by the tenant whitelist.
 */
export function getAppsForTenant(
  plan: PlanTier,
  enabledAppIds?: string[] | null,
): DesktopApp[] {
  const planApps = getAppsForPlan(plan);
  if (!enabledAppIds) return planApps;

  const enabledSet = new Set(enabledAppIds);
  return planApps.filter(
    (app) => app.category === "system" || enabledSet.has(app.id),
  );
}

/** Check if an app is locked (available in plan but disabled by tenant) */
export function isAppLocked(
  appId: string,
  plan: PlanTier,
  enabledAppIds?: string[] | null,
): boolean {
  const app = getApp(appId);
  if (!app) return true;

  // Not in plan
  if (app.minPlan && !planMeetsMinimum(plan, app.minPlan)) return true;

  // In plan but disabled by tenant
  if (
    enabledAppIds &&
    app.category !== "system" &&
    !enabledAppIds.includes(appId)
  )
    return true;

  return false;
}

/** Pre-memoized lazy components keyed by app ID */
const lazyComponentCache = new Map<string, ReturnType<typeof lazy>>();

/** Lazy-load a component for a desktop app (memoized per app) */
export function getLazyComponent(app: DesktopApp) {
  let cached = lazyComponentCache.get(app.id);
  if (!cached) {
    cached = lazy(app.component);
    lazyComponentCache.set(app.id, cached);
  }
  return cached;
}
