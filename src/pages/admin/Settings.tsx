import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, CheckCircle, AlertCircle, Ghost, Database, Key, Eye, EyeOff, BarChart3, Globe, Search, Shield, Activity, Layers, Code2, Palette, Zap } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { useSession } from '@clerk/clerk-react';
import { getSupabaseSettings, saveSupabaseSettings, useAuthenticatedSupabase } from '@/lib/supabase';
import { getAnalyticsSettings, saveAnalyticsSettings } from '@/lib/analytics';
import { getGhostSettings, saveGhostSettings } from '@/lib/ghost';
import { useSEO, clearSEOCache } from '@/lib/seo';
import { getSiteContent, upsertSiteContent } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';

interface SEOSettings {
  siteName: string;
  siteUrl: string;
  defaultDescription: string;
  ogImage: string;
  twitterHandle: string;
  linkedinUrl: string;
  githubUrl: string;
  location: { city: string; state: string; country: string };
}

const defaultSEO: SEOSettings = {
  siteName: 'Jonathan Christensen',
  siteUrl: 'https://mejohnc.org',
  defaultDescription: 'AI Automation Engineer specializing in agentic systems, automation pipelines, and AI-powered workflows.',
  ogImage: '/og-image.png',
  twitterHandle: '',
  linkedinUrl: 'https://linkedin.com/in/mejohnc',
  githubUrl: 'https://github.com/mejohnc-ft',
  location: { city: 'San Diego', state: 'CA', country: 'USA' },
};

// Tech stack data
const techStack = [
  {
    category: 'Frontend',
    icon: Code2,
    color: 'text-blue-400',
    items: [
      { name: 'React', version: '18.3.1', reason: 'Component-based UI with hooks for state management' },
      { name: 'TypeScript', version: '5.6.2', reason: 'Type safety and better DX with autocomplete' },
      { name: 'Vite', version: '6.0.1', reason: 'Lightning-fast HMR and optimized builds' },
      { name: 'Tailwind CSS', version: '3.4.15', reason: 'Utility-first CSS for rapid styling' },
      { name: 'Framer Motion', version: '11.11.17', reason: 'Smooth, physics-based animations' },
    ],
  },
  {
    category: 'Backend & Data',
    icon: Database,
    color: 'text-emerald-400',
    items: [
      { name: 'Supabase', version: '2.50.3', reason: 'PostgreSQL with real-time, auth, and instant APIs' },
      { name: 'Clerk', version: '5.18.0', reason: 'Drop-in auth with social logins and session management' },
    ],
  },
  {
    category: 'UI Components',
    icon: Palette,
    color: 'text-purple-400',
    items: [
      { name: 'Radix UI', version: '1.1.x', reason: 'Accessible, unstyled primitives for custom components' },
      { name: 'Lucide Icons', version: '0.460.0', reason: 'Consistent, customizable icon set' },
      { name: 'Recharts', version: '2.15.0', reason: 'Composable charting for data visualization' },
    ],
  },
  {
    category: 'Build & Deploy',
    icon: Zap,
    color: 'text-yellow-400',
    items: [
      { name: 'ESLint', version: '9.13.0', reason: 'Code quality and consistent style enforcement' },
      { name: 'PostCSS', version: '8.4.47', reason: 'CSS processing with autoprefixer' },
    ],
  },
];

const Settings = () => {
  useSEO({ title: 'Configuration', noIndex: true });
  const { user } = useAuth();
  const { session } = useSession();
  const { supabase } = useAuthenticatedSupabase();

  // Visibility toggles
  const [showGhostKey, setShowGhostKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);

  // Ghost state
  const [ghostUrl, setGhostUrl] = useState('');
  const [ghostKey, setGhostKey] = useState('');
  const [ghostStatus, setGhostStatus] = useState<'idle' | 'testing' | 'saving' | 'success' | 'error'>('idle');
  const [ghostMessage, setGhostMessage] = useState('');
  const [ghostConfigured, setGhostConfigured] = useState(false);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'testing' | 'saving' | 'success' | 'error'>('idle');
  const [supabaseMessage, setSupabaseMessage] = useState('');

  // Clerk state
  const [clerkStatus, setClerkStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [clerkMessage, setClerkMessage] = useState('');

  // Google Analytics state
  const [gaMeasurementId, setGaMeasurementId] = useState('');
  const [gaStatus, setGaStatus] = useState<'idle' | 'testing' | 'saving' | 'success' | 'error'>('idle');
  const [gaMessage, setGaMessage] = useState('');

  // SEO Settings state
  const [seo, setSeo] = useState<SEOSettings>(defaultSEO);
  const [seoStatus, setSeoStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [seoMessage, setSeoMessage] = useState('');

  useEffect(() => {
    const ghost = getGhostSettings();
    if (ghost) {
      setGhostUrl(ghost.url);
      setGhostKey(ghost.contentApiKey);
      setGhostConfigured(true);
    }

    const supa = getSupabaseSettings();
    setSupabaseUrl(supa.url);
    setSupabaseKey(supa.anonKey);

    const ga = getAnalyticsSettings();
    setGaMeasurementId(ga.measurementId);

    async function loadSEO() {
      try {
        const data = await getSiteContent('seo', supabase);
        if (data?.content) {
          const parsed = JSON.parse(data.content);
          setSeo({ ...defaultSEO, ...parsed });
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Settings.loadSEO' });
      }
    }

    async function loadAnalytics() {
      try {
        const data = await getSiteContent('analytics', supabase);
        if (data?.content) {
          const parsed = JSON.parse(data.content);
          if (parsed.measurementId) {
            setGaMeasurementId(parsed.measurementId);
          }
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Settings.loadAnalytics' });
      }
    }

    loadSEO();
    loadAnalytics();
  }, [supabase]);

  const saveSEO = async () => {
    setSeoStatus('saving');
    try {
      await upsertSiteContent('seo', {
        title: 'SEO Settings',
        content: JSON.stringify(seo),
      }, supabase);
      clearSEOCache();
      setSeoStatus('success');
      setSeoMessage('Saved!');
      setTimeout(() => { setSeoStatus('idle'); setSeoMessage(''); }, 2000);
    } catch (err) {
      setSeoStatus('error');
      setSeoMessage('Failed');
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Settings.saveSEO' });
    }
  };

  const testGhost = async () => {
    if (!ghostUrl || !ghostKey) { setGhostStatus('error'); setGhostMessage('Enter URL and key'); return; }
    setGhostStatus('testing');
    try {
      let url = ghostUrl.trim().replace(/\/$/, '');
      if (!url.startsWith('http')) url = `https://${url}`;
      const res = await fetch(`${url}/ghost/api/content/posts/?key=${ghostKey}&limit=1`, { headers: { 'Accept-Version': 'v5.0' } });
      if (res.ok) {
        const data = await res.json();
        setGhostStatus('success');
        setGhostMessage(`${data.meta?.pagination?.total || 0} posts`);
      } else { setGhostStatus('error'); setGhostMessage(`${res.status}`); }
    } catch { setGhostStatus('error'); setGhostMessage('Failed'); }
  };

  const saveGhost = () => {
    saveGhostSettings({ url: ghostUrl, contentApiKey: ghostKey });
    setGhostConfigured(!!(ghostUrl && ghostKey));
    setGhostStatus('success');
    setGhostMessage('Saved');
    setTimeout(() => { setGhostStatus('idle'); setGhostMessage(''); }, 2000);
  };

  const testSupabase = async () => {
    if (!supabaseUrl || !supabaseKey) { setSupabaseStatus('error'); setSupabaseMessage('Enter URL and key'); return; }
    setSupabaseStatus('testing');
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/site_content?select=id&limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      if (res.ok) {
        setSupabaseStatus('success'); setSupabaseMessage('Connected');
      } else { setSupabaseStatus('error'); setSupabaseMessage(`${res.status}`); }
    } catch { setSupabaseStatus('error'); setSupabaseMessage('Failed'); }
  };

  const saveSupabase = () => {
    saveSupabaseSettings({ url: supabaseUrl, anonKey: supabaseKey });
    setSupabaseStatus('success'); setSupabaseMessage('Saved');
    setTimeout(() => { setSupabaseStatus('idle'); setSupabaseMessage(''); }, 2000);
  };

  const testClerk = async () => {
    setClerkStatus('testing');
    try {
      if (!user || !session) { setClerkStatus('error'); setClerkMessage('Not signed in'); return; }
      const token = await session.getToken();
      if (token) {
        setClerkStatus('success');
        setClerkMessage('Token OK');
      } else { setClerkStatus('error'); setClerkMessage('No token'); }
    } catch { setClerkStatus('error'); setClerkMessage('Failed'); }
  };

  const testGA = async () => {
    if (!gaMeasurementId) { setGaStatus('error'); setGaMessage('Enter ID'); return; }
    const gaPattern = /^G-[A-Z0-9]+$/i;
    if (!gaPattern.test(gaMeasurementId.trim())) { setGaStatus('error'); setGaMessage('Invalid format'); return; }
    setGaStatus('success'); setGaMessage('Valid');
  };

  const saveGA = async () => {
    setGaStatus('saving');
    try {
      // Save to localStorage for quick access
      saveAnalyticsSettings({ measurementId: gaMeasurementId.trim() });
      // Save to database for persistence
      await upsertSiteContent('analytics', {
        title: 'Analytics Settings',
        content: JSON.stringify({ measurementId: gaMeasurementId.trim() }),
      }, supabase);
      setGaStatus('success');
      setGaMessage('Saved');
      setTimeout(() => { setGaStatus('idle'); setGaMessage(''); }, 2000);
    } catch (err) {
      setGaStatus('error');
      setGaMessage('Failed');
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Settings.saveAnalytics' });
    }
  };

  const StatusBadge = ({ status, message }: { status: string; message: string }) => {
    if (!message) return null;
    const isSuccess = status === 'success';
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {isSuccess ? <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <AlertCircle className="w-2.5 h-2.5 inline mr-0.5" />}
        {message}
      </span>
    );
  };

  const ConfiguredBadge = ({ configured }: { configured: boolean }) => (
    <span className={`text-[9px] px-1.5 py-0.5 rounded ${configured ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
      {configured ? 'OK' : '—'}
    </span>
  );

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Configuration</h1>
          <p className="text-muted-foreground">Manage integrations, SEO, and site settings</p>
        </div>

        {/* Integrations - 4 column compact grid */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Integrations
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Ghost */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ghost className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-sm">Ghost</span>
                </div>
                <ConfiguredBadge configured={ghostConfigured} />
              </div>
              <input
                type="url"
                value={ghostUrl}
                onChange={(e) => setGhostUrl(e.target.value)}
                placeholder="ghost.io URL"
                className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
              />
              <div className="relative">
                <input
                  type={showGhostKey ? 'text' : 'password'}
                  value={ghostKey}
                  onChange={(e) => setGhostKey(e.target.value)}
                  placeholder="API Key"
                  className="w-full px-2 py-1 pr-7 bg-background border border-border rounded text-xs font-mono"
                />
                <button onClick={() => setShowGhostKey(!showGhostKey)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showGhostKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={testGhost} disabled={ghostStatus === 'testing'} className="h-6 text-xs px-2">
                  {ghostStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </Button>
                <Button size="sm" onClick={saveGhost} className="h-6 text-xs px-2">Save</Button>
                <StatusBadge status={ghostStatus} message={ghostMessage} />
              </div>
            </div>

            {/* Clerk */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-sm">Clerk</span>
                </div>
                <ConfiguredBadge configured={!!user} />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Status</span>
                  <span className={user ? 'text-green-400' : 'text-red-400'}>{user ? 'Signed In' : 'Not Signed In'}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                  <span className="text-muted-foreground">User</span>
                  <span className="truncate ml-1 max-w-[100px]">{user?.primaryEmailAddress?.emailAddress || '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={testClerk} disabled={clerkStatus === 'testing'} className="h-6 text-xs px-2">
                  {clerkStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </Button>
                <StatusBadge status={clerkStatus} message={clerkMessage} />
              </div>
            </div>

            {/* Supabase */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-sm">Supabase</span>
                </div>
                <ConfiguredBadge configured={!!(supabaseUrl && supabaseKey)} />
              </div>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="supabase.co URL"
                className="w-full px-2 py-1 bg-background border border-border rounded text-xs font-mono"
              />
              <div className="relative">
                <input
                  type={showSupabaseKey ? 'text' : 'password'}
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="Anon Key"
                  className="w-full px-2 py-1 pr-7 bg-background border border-border rounded text-xs font-mono"
                />
                <button onClick={() => setShowSupabaseKey(!showSupabaseKey)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showSupabaseKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={testSupabase} disabled={supabaseStatus === 'testing'} className="h-6 text-xs px-2">
                  {supabaseStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </Button>
                <Button size="sm" onClick={saveSupabase} className="h-6 text-xs px-2">Save</Button>
                <StatusBadge status={supabaseStatus} message={supabaseMessage} />
              </div>
            </div>

            {/* Google Analytics */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-sm">Analytics</span>
                </div>
                <ConfiguredBadge configured={!!gaMeasurementId} />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Status</span>
                  <span className={gaMeasurementId ? 'text-green-400' : 'text-red-400'}>
                    {gaMeasurementId ? 'Active' : 'Not Configured'}
                  </span>
                </div>
                {gaMeasurementId && (
                  <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono">{gaMeasurementId.slice(0, 4)}••••{gaMeasurementId.slice(-3)}</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={gaMeasurementId}
                onChange={(e) => setGaMeasurementId(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-2 py-1 bg-background border border-border rounded text-xs font-mono"
              />
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={testGA} disabled={gaStatus === 'testing' || gaStatus === 'saving'} className="h-6 text-xs px-2">
                  {gaStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </Button>
                <Button size="sm" onClick={saveGA} disabled={gaStatus === 'saving'} className="h-6 text-xs px-2">
                  {gaStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </Button>
                <StatusBadge status={gaStatus} message={gaMessage} />
              </div>
            </div>
          </div>
        </section>

        {/* SEO & Metadata - Two column layout */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            SEO & Metadata
          </h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic SEO */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Site Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Site Name</label>
                    <input
                      type="text"
                      value={seo.siteName}
                      onChange={(e) => setSeo({ ...seo, siteName: e.target.value })}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Site URL</label>
                    <input
                      type="url"
                      value={seo.siteUrl}
                      onChange={(e) => setSeo({ ...seo, siteUrl: e.target.value })}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Meta Description <span className="text-muted-foreground">({seo.defaultDescription.length}/160)</span></label>
                  <textarea
                    value={seo.defaultDescription}
                    onChange={(e) => setSeo({ ...seo, defaultDescription: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">OG Image Path</label>
                  <input
                    type="text"
                    value={seo.ogImage}
                    onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Location
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={seo.location.city}
                      onChange={(e) => setSeo({ ...seo, location: { ...seo.location, city: e.target.value } })}
                      placeholder="City"
                      className="px-2 py-1.5 bg-background border border-border rounded text-sm"
                    />
                    <input
                      type="text"
                      value={seo.location.state}
                      onChange={(e) => setSeo({ ...seo, location: { ...seo.location, state: e.target.value } })}
                      placeholder="State"
                      className="px-2 py-1.5 bg-background border border-border rounded text-sm"
                    />
                    <input
                      type="text"
                      value={seo.location.country}
                      onChange={(e) => setSeo({ ...seo, location: { ...seo.location, country: e.target.value } })}
                      placeholder="Country"
                      className="px-2 py-1.5 bg-background border border-border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Social Links */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Social Links
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={seo.linkedinUrl}
                      onChange={(e) => setSeo({ ...seo, linkedinUrl: e.target.value })}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={seo.githubUrl}
                      onChange={(e) => setSeo({ ...seo, githubUrl: e.target.value })}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Twitter/X Handle</label>
                    <input
                      type="text"
                      value={seo.twitterHandle}
                      onChange={(e) => setSeo({ ...seo, twitterHandle: e.target.value })}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                      placeholder="@username or URL"
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex items-center gap-2">
                    <Button onClick={saveSEO} disabled={seoStatus === 'saving'} size="sm">
                      {seoStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Save SEO Settings
                    </Button>
                    {seoMessage && (
                      <span className={`text-xs px-2 py-1 rounded ${seoStatus === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {seoMessage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Visibility */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security & Visibility
          </h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground text-xs uppercase">Session</h3>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground text-xs">User</div>
                  <div className="truncate">{user?.primaryEmailAddress?.emailAddress || 'Not signed in'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground text-xs uppercase">Auth</h3>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground text-xs">Provider</div>
                  <div>Clerk + Supabase</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground text-xs uppercase">Environment</h3>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground text-xs">Mode</div>
                  <div>{import.meta.env.PROD ? 'Production' : 'Development'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground text-xs uppercase">Build</h3>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground text-xs">Base URL</div>
                  <div className="font-mono text-xs truncate">{import.meta.env.BASE_URL || '/'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Tech Stack
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {techStack.map((category) => (
              <div key={category.category} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <category.icon className={`w-4 h-4 ${category.color}`} />
                  <h3 className="font-semibold">{category.category}</h3>
                </div>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div key={item.name} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            v{item.version}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    </AdminLayout>
  );
};

export default Settings;
