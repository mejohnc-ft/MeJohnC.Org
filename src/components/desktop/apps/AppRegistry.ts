import { lazy, ComponentType } from 'react';

export type AppCategory = 'content' | 'ai' | 'management' | 'platform' | 'agents' | 'system';

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
}

// Lazy component factories — reusing the same imports as App.tsx
const apps: DesktopApp[] = [
  // Dashboard (pinned)
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'LayoutDashboard',
    color: 'text-blue-500',
    category: 'system',
    component: () => import('@/pages/admin/Dashboard'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: '/admin',
  },

  // Content
  {
    id: 'blog',
    name: 'Blog',
    icon: 'FileText',
    color: 'text-emerald-500',
    category: 'content',
    component: () => import('@/pages/admin/blog/index'),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 500, height: 350 },
    singleton: true,
    defaultDockPinned: true,
    route: '/admin/blog',
  },
  {
    id: 'news',
    name: 'News',
    icon: 'Newspaper',
    color: 'text-orange-500',
    category: 'content',
    component: () => import('@/features/news/pages/FeedPage'),
    defaultSize: { width: 800, height: 550 },
    minSize: { width: 500, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/news',
  },
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    icon: 'Bookmark',
    color: 'text-yellow-500',
    category: 'content',
    component: () => import('@/pages/admin/bookmarks/index'),
    defaultSize: { width: 750, height: 550 },
    minSize: { width: 450, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/bookmarks',
  },

  // AI Tools
  {
    id: 'ai-manager',
    name: 'AI Manager',
    icon: 'Bot',
    color: 'text-purple-500',
    category: 'ai',
    component: () => import('@/pages/admin/ai-manager/index'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: '/admin/ai-manager',
  },
  {
    id: 'prompts',
    name: 'Prompts',
    icon: 'BookText',
    color: 'text-violet-500',
    category: 'ai',
    component: () => import('@/pages/admin/PromptLibrary'),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/prompts',
  },
  {
    id: 'skills',
    name: 'Skills',
    icon: 'Wrench',
    color: 'text-cyan-500',
    category: 'ai',
    component: () => import('@/pages/admin/SkillsRegistry'),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/skills',
  },
  {
    id: 'runbooks',
    name: 'Runbooks',
    icon: 'BookOpen',
    color: 'text-teal-500',
    category: 'ai',
    component: () => import('@/pages/admin/Runbooks'),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/runbooks',
  },

  // Management
  {
    id: 'tasks',
    name: 'Tasks',
    icon: 'CheckSquare',
    color: 'text-green-500',
    category: 'management',
    component: () => import('@/features/tasks/pages/TasksPage'),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: '/admin/tasks',
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: 'Users',
    color: 'text-blue-400',
    category: 'management',
    component: () => import('@/features/crm/pages/ContactsPage'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/crm',
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: 'FolderKanban',
    color: 'text-indigo-500',
    category: 'management',
    component: () => import('@/pages/admin/projects/index'),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/projects',
  },
  {
    id: 'apps',
    name: 'Apps',
    icon: 'AppWindow',
    color: 'text-pink-500',
    category: 'management',
    component: () => import('@/pages/admin/apps/index'),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/apps',
  },
  {
    id: 'metrics',
    name: 'Metrics',
    icon: 'BarChart3',
    color: 'text-amber-500',
    category: 'management',
    component: () => import('@/features/metrics/pages/DashboardPage'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/metrics',
  },

  // Platform
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    icon: 'Server',
    color: 'text-gray-500',
    category: 'platform',
    component: () => import('@/pages/admin/InfrastructureMap'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 450 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/infrastructure',
  },
  {
    id: 'apis',
    name: 'APIs',
    icon: 'Cable',
    color: 'text-rose-500',
    category: 'platform',
    component: () => import('@/pages/admin/ApiRegistry'),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/apis',
  },
  {
    id: 'configs',
    name: 'Configs',
    icon: 'FileCode2',
    color: 'text-slate-500',
    category: 'platform',
    component: () => import('@/pages/admin/ConfigVault'),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/configs',
  },

  // Agent Platform
  {
    id: 'agents',
    name: 'Agents',
    icon: 'Bot',
    color: 'text-orange-600',
    category: 'agents',
    component: () => import('@/pages/admin/AgentRegistry'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: true,
    route: '/admin/agents',
  },
  {
    id: 'workflows',
    name: 'Workflows',
    icon: 'GitBranch',
    color: 'text-fuchsia-500',
    category: 'agents',
    component: () => import('@/pages/admin/Workflows'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 450 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/workflows',
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    icon: 'Clock',
    color: 'text-sky-500',
    category: 'agents',
    component: () => import('@/pages/admin/Scheduler'),
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/scheduler',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: 'Plug',
    color: 'text-lime-500',
    category: 'agents',
    component: () => import('@/pages/admin/IntegrationHub'),
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 550, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/integrations',
  },
  {
    id: 'audit',
    name: 'Audit Log',
    icon: 'FileSearch',
    color: 'text-stone-500',
    category: 'agents',
    component: () => import('@/pages/admin/AuditLog'),
    defaultSize: { width: 900, height: 650 },
    minSize: { width: 600, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/audit',
  },

  // System
  {
    id: 'settings',
    name: 'Settings',
    icon: 'Settings',
    color: 'text-gray-400',
    category: 'system',
    component: () => import('@/pages/admin/Settings'),
    defaultSize: { width: 750, height: 550 },
    minSize: { width: 500, height: 400 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/settings',
  },
  {
    id: 'profile',
    name: 'Profile',
    icon: 'User',
    color: 'text-blue-300',
    category: 'system',
    component: () => import('@/pages/admin/Profile'),
    defaultSize: { width: 700, height: 500 },
    minSize: { width: 450, height: 350 },
    singleton: true,
    defaultDockPinned: false,
    route: '/admin/profile',
  },
];

/** All registered desktop apps */
export const appRegistry = apps;

/** Get an app by its ID */
export function getApp(id: string): DesktopApp | undefined {
  return apps.find(a => a.id === id);
}

/** Get apps pinned to dock by default */
export function getDefaultDockApps(): DesktopApp[] {
  return apps.filter(a => a.defaultDockPinned);
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

/** Lazy-load a component for a desktop app */
export function getLazyComponent(app: DesktopApp) {
  return lazy(app.component);
}
