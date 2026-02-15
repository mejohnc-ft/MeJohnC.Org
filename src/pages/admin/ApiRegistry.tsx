import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Cable,
  Search,
  Database,
  Key,
  Ghost,
  Bot,
  Figma,
  Github,
  BarChart3,
  Mail,
  Bug,
  Newspaper,
  Server,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  FileCode2,
  Shield,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useSEO } from '@/lib/seo';

interface ApiEntry {
  id: string;
  name: string;
  description: string;
  direction: 'outbound' | 'inbound';
  category: 'database' | 'auth' | 'cms' | 'ai' | 'design' | 'devops' | 'analytics' | 'email' | 'monitoring' | 'news' | 'edge-function';
  authType: 'api-key' | 'jwt' | 'anon-key' | 'publishable-key' | 'personal-access-token' | 'dsn' | 'measurement-id' | 'service-key' | 'webhook-secret' | 'none';
  baseUrl: string | null;
  envVars: string[];
  configFile: string;
  docsUrl?: string;
}

const API_REGISTRY: ApiEntry[] = [
  // Outbound APIs
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'PostgreSQL database with real-time subscriptions, auth, and REST/GraphQL APIs',
    direction: 'outbound',
    category: 'database',
    authType: 'anon-key',
    baseUrl: 'https://<project>.supabase.co',
    envVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    configFile: 'src/lib/supabase.ts',
    docsUrl: 'https://supabase.com/docs',
  },
  {
    id: 'clerk',
    name: 'Clerk',
    description: 'Authentication and user management with social logins and session handling',
    direction: 'outbound',
    category: 'auth',
    authType: 'publishable-key',
    baseUrl: 'https://api.clerk.com',
    envVars: ['VITE_CLERK_PUBLISHABLE_KEY'],
    configFile: 'src/lib/auth.tsx',
    docsUrl: 'https://clerk.com/docs',
  },
  {
    id: 'ghost',
    name: 'Ghost CMS',
    description: 'Headless content management system for blog posts and publications',
    direction: 'outbound',
    category: 'cms',
    authType: 'api-key',
    baseUrl: null,
    envVars: ['VITE_GHOST_URL', 'VITE_GHOST_CONTENT_API_KEY'],
    configFile: 'src/lib/ghost.ts',
    docsUrl: 'https://ghost.org/docs/content-api/',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'AI language model API for content generation, analysis, and intelligent features',
    direction: 'outbound',
    category: 'ai',
    authType: 'api-key',
    baseUrl: 'https://api.anthropic.com',
    envVars: ['VITE_ANTHROPIC_API_KEY'],
    configFile: 'src/lib/ai.ts',
    docsUrl: 'https://docs.anthropic.com',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Design platform API for accessing design tokens, components, and assets',
    direction: 'outbound',
    category: 'design',
    authType: 'personal-access-token',
    baseUrl: 'https://api.figma.com',
    envVars: ['VITE_FIGMA_TOKEN'],
    configFile: 'src/lib/figma.ts',
    docsUrl: 'https://www.figma.com/developers/api',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Source code hosting and CI/CD via GitHub Actions for automated deployments',
    direction: 'outbound',
    category: 'devops',
    authType: 'personal-access-token',
    baseUrl: 'https://api.github.com',
    envVars: ['VITE_GITHUB_TOKEN'],
    configFile: '.github/workflows/',
    docsUrl: 'https://docs.github.com/en/rest',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Web analytics for tracking page views, user behavior, and engagement metrics',
    direction: 'outbound',
    category: 'analytics',
    authType: 'measurement-id',
    baseUrl: 'https://www.google-analytics.com',
    envVars: ['VITE_GA_MEASUREMENT_ID'],
    configFile: 'src/lib/analytics.ts',
    docsUrl: 'https://developers.google.com/analytics',
  },
  {
    id: 'email',
    name: 'Email (Resend/SendGrid)',
    description: 'Transactional email delivery for notifications, campaigns, and user communications',
    direction: 'outbound',
    category: 'email',
    authType: 'api-key',
    baseUrl: 'https://api.resend.com',
    envVars: ['VITE_RESEND_API_KEY', 'VITE_SENDGRID_API_KEY'],
    configFile: 'src/lib/email.ts',
    docsUrl: 'https://resend.com/docs',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Error monitoring and performance tracking with real-time alerting',
    direction: 'outbound',
    category: 'monitoring',
    authType: 'dsn',
    baseUrl: 'https://sentry.io',
    envVars: ['VITE_SENTRY_DSN'],
    configFile: 'src/lib/sentry.ts',
    docsUrl: 'https://docs.sentry.io',
  },
  {
    id: 'newsapi',
    name: 'NewsAPI',
    description: 'News aggregation API for fetching headlines and articles from various sources',
    direction: 'outbound',
    category: 'news',
    authType: 'api-key',
    baseUrl: 'https://newsapi.org',
    envVars: ['VITE_NEWS_API_KEY'],
    configFile: 'src/lib/news.ts',
    docsUrl: 'https://newsapi.org/docs',
  },
  // Inbound APIs (edge functions)
  {
    id: 'health-check',
    name: 'health-check',
    description: 'Health check endpoint returning service status and uptime information',
    direction: 'inbound',
    category: 'edge-function',
    authType: 'none',
    baseUrl: '/api/health-check',
    envVars: [],
    configFile: 'supabase/functions/health-check/',
  },
  {
    id: 'fetch-news',
    name: 'fetch-news',
    description: 'Serverless function that fetches and caches news articles from external sources',
    direction: 'inbound',
    category: 'edge-function',
    authType: 'service-key',
    baseUrl: '/api/fetch-news',
    envVars: [],
    configFile: 'supabase/functions/fetch-news/',
  },
  {
    id: 'metrics-sync',
    name: 'metrics-sync',
    description: 'Scheduled function that syncs analytics and performance metrics to the database',
    direction: 'inbound',
    category: 'edge-function',
    authType: 'service-key',
    baseUrl: '/api/metrics-sync',
    envVars: [],
    configFile: 'supabase/functions/metrics-sync/',
  },
  {
    id: 'metrics-webhook',
    name: 'metrics-webhook',
    description: 'Webhook receiver for external metrics and monitoring service callbacks',
    direction: 'inbound',
    category: 'edge-function',
    authType: 'webhook-secret',
    baseUrl: '/api/metrics-webhook',
    envVars: [],
    configFile: 'supabase/functions/metrics-webhook/',
  },
  {
    id: 'rate-limit',
    name: 'rate-limit',
    description: 'Rate limiting middleware for API endpoints to prevent abuse',
    direction: 'inbound',
    category: 'edge-function',
    authType: 'none',
    baseUrl: '/api/rate-limit',
    envVars: [],
    configFile: 'supabase/functions/rate-limit/',
  },
];

const CATEGORY_ICONS: Record<ApiEntry['category'], typeof Database> = {
  database: Database,
  auth: Key,
  cms: Ghost,
  ai: Bot,
  design: Figma,
  devops: Github,
  analytics: BarChart3,
  email: Mail,
  monitoring: Bug,
  news: Newspaper,
  'edge-function': Server,
};

const CATEGORY_COLORS: Record<ApiEntry['category'], string> = {
  database: 'text-emerald-400',
  auth: 'text-purple-400',
  cms: 'text-orange-400',
  ai: 'text-cyan-400',
  design: 'text-pink-400',
  devops: 'text-gray-400',
  analytics: 'text-yellow-400',
  email: 'text-blue-400',
  monitoring: 'text-red-400',
  news: 'text-amber-400',
  'edge-function': 'text-indigo-400',
};

const AUTH_LABELS: Record<ApiEntry['authType'], string> = {
  'api-key': 'API Key',
  'jwt': 'JWT',
  'anon-key': 'Anon Key',
  'publishable-key': 'Pub Key',
  'personal-access-token': 'PAT',
  'dsn': 'DSN',
  'measurement-id': 'Meas. ID',
  'service-key': 'Service Key',
  'webhook-secret': 'Webhook Secret',
  'none': 'None',
};

function getEnvStatus(entry: ApiEntry): 'configured' | 'partial' | 'missing' | 'na' {
  if (entry.envVars.length === 0) return 'na';

  const results = entry.envVars.map((v) => !!import.meta.env[v]);

  // Email uses OR logic: either Resend or SendGrid is fine
  if (entry.id === 'email') {
    return results.some(Boolean) ? 'configured' : 'missing';
  }

  const configuredCount = results.filter(Boolean).length;
  if (configuredCount === entry.envVars.length) return 'configured';
  if (configuredCount > 0) return 'partial';
  return 'missing';
}

function StatusBadge({ status }: { status: ReturnType<typeof getEnvStatus> }) {
  switch (status) {
    case 'configured':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Configured</Badge>;
    case 'partial':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Partial</Badge>;
    case 'missing':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Missing</Badge>;
    case 'na':
      return <Badge className="bg-muted text-muted-foreground border-border text-[10px]">N/A</Badge>;
  }
}

function ApiCard({ entry }: { entry: ApiEntry }) {
  const CategoryIcon = CATEGORY_ICONS[entry.category];
  const categoryColor = CATEGORY_COLORS[entry.category];
  const status = getEnvStatus(entry);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <CategoryIcon className={`w-5 h-5 ${categoryColor} flex-shrink-0`} />
          <div>
            <h3 className="font-semibold text-sm text-foreground">{entry.name}</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{entry.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <Shield className="w-2.5 h-2.5 mr-0.5" />
            {AUTH_LABELS[entry.authType]}
          </Badge>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>

      {/* Details */}
      <div className="space-y-1.5">
        {entry.baseUrl && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-14 flex-shrink-0">URL</span>
            <code className="font-mono text-[11px] text-foreground/80 truncate">{entry.baseUrl}</code>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-14 flex-shrink-0">Config</span>
          <code className="font-mono text-[11px] text-foreground/80 flex items-center gap-1">
            <FileCode2 className="w-3 h-3 flex-shrink-0" />
            {entry.configFile}
          </code>
        </div>
      </div>

      {/* Env vars + docs link */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-wrap gap-1">
          {entry.envVars.length > 0 ? (
            entry.envVars.map((envVar) => {
              const isSet = !!import.meta.env[envVar];
              return (
                <span
                  key={envVar}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSet
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {envVar}
                </span>
              );
            })
          ) : (
            <span className="text-[10px] text-muted-foreground italic">No env vars</span>
          )}
        </div>
        {entry.docsUrl && (
          <a
            href={entry.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors flex-shrink-0"
          >
            Docs
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

type DirectionFilter = 'all' | 'outbound' | 'inbound';

const ApiRegistry = () => {
  useSEO({ title: 'API Registry', noIndex: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');

  const filteredApis = useMemo(() => {
    let result = API_REGISTRY;

    if (directionFilter !== 'all') {
      result = result.filter((api) => api.direction === directionFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (api) =>
          api.name.toLowerCase().includes(query) ||
          api.description.toLowerCase().includes(query) ||
          api.category.toLowerCase().includes(query),
      );
    }

    return result;
  }, [searchQuery, directionFilter]);

  const outboundApis = filteredApis.filter((api) => api.direction === 'outbound');
  const inboundApis = filteredApis.filter((api) => api.direction === 'inbound');

  const totalConfigured = API_REGISTRY.filter((api) => {
    const status = getEnvStatus(api);
    return status === 'configured' || status === 'na';
  }).length;

  const totalOutbound = API_REGISTRY.filter((api) => api.direction === 'outbound').length;
  const totalInbound = API_REGISTRY.filter((api) => api.direction === 'inbound').length;

  const DIRECTION_OPTIONS: { value: DirectionFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'outbound', label: 'Outbound' },
    { value: 'inbound', label: 'Inbound' },
  ];

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">API Registry</h1>
          <p className="text-muted-foreground">All APIs consumed and exposed by this application</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{API_REGISTRY.length}</div>
            <div className="text-xs text-muted-foreground">Total APIs</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              {totalOutbound}
            </div>
            <div className="text-xs text-muted-foreground">Outbound</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
              <ArrowDownLeft className="w-4 h-4" />
              {totalInbound}
            </div>
            <div className="text-xs text-muted-foreground">Inbound</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{totalConfigured}/{API_REGISTRY.length}</div>
            <div className="text-xs text-muted-foreground">Configured</div>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search APIs by name, description, or category..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DIRECTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDirectionFilter(option.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  directionFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outbound APIs */}
        {outboundApis.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-blue-400" />
              Outbound APIs
              <Badge variant="outline" className="text-xs ml-1">{outboundApis.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {outboundApis.map((api) => (
                <ApiCard key={api.id} entry={api} />
              ))}
            </div>
          </section>
        )}

        {/* Inbound APIs */}
        {inboundApis.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
              Inbound APIs
              <Badge variant="outline" className="text-xs ml-1">{inboundApis.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {inboundApis.map((api) => (
                <ApiCard key={api.id} entry={api} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredApis.length === 0 && (
          <div className="text-center py-12">
            <Cable className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No APIs match your search</p>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default ApiRegistry;
