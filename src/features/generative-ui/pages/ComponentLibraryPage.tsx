/**
 * ComponentLibraryPage
 *
 * Showcases all available CentrexStyle components
 * that can be used in generative UI panels.
 */

'use client';

import { Sparkles, BookOpen, Bookmark } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatGrid } from '../components/StatGrid';
import { CommandPalette } from '../components/CommandPalette';
import { Carousel3D } from '../components/Carousel3D';
import { MetricChart } from '../components/MetricChart';
import { ColorPalette } from '../components/ColorPalette';

const COMPONENT_DEMOS = [
  {
    name: 'StatCard',
    description: 'Hero statistic display with gradient accent and trend indicator.',
    component: (
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        <StatCard value="$52.4K" label="Revenue" color="green" trend="up" trendValue="+12.5%" />
        <StatCard value="2,847" label="Users" color="blue" trend="up" trendValue="+8.2%" />
      </div>
    ),
  },
  {
    name: 'StatGrid',
    description: 'Responsive grid layout for multiple stat cards.',
    component: (
      <StatGrid
        columns={4}
        stats={[
          { value: '$52.4K', label: 'Revenue', color: 'green', trend: 'up', trendValue: '+12.5%' },
          { value: '2,847', label: 'Users', color: 'blue', trend: 'up', trendValue: '+8.2%' },
          { value: '1,234', label: 'Orders', color: 'orange', trend: 'up', trendValue: '+23.1%' },
          { value: '94.2%', label: 'Growth', color: 'red', trend: 'down', trendValue: '-2.4%' },
        ]}
      />
    ),
  },
  {
    name: 'CommandPalette',
    description: 'Grouped command interface with interactive hover effects.',
    component: (
      <CommandPalette
        groups={[
          {
            title: 'Deployment',
            icon: 'rocket',
            commands: [
              { code: '/deploy', description: 'Deploy to production' },
              { code: '/rollback', description: 'Rollback last deploy' },
            ],
          },
          {
            title: 'Database',
            icon: 'database',
            commands: [
              { code: '/migrate', description: 'Run migrations' },
              { code: '/backup', description: 'Create backup' },
            ],
          },
        ]}
      />
    ),
  },
  {
    name: 'MetricChart',
    description: 'Data visualization with line, bar, and area chart types.',
    component: (
      <div className="w-full max-w-2xl">
        <MetricChart
          metricName="Performance"
          chartType="area"
          timeRange="7d"
          color="green"
          title="Weekly Performance"
        />
      </div>
    ),
  },
  {
    name: 'Carousel3D',
    description: 'Flywheel-style 3D rotating card carousel.',
    component: (
      <div className="w-full max-w-3xl">
        <Carousel3D
          autoRotate={false}
          cards={[
            {
              icon: 'rocket',
              title: 'Fast Deploy',
              body: 'Deploy in seconds with CI/CD.',
              statValue: '< 30s',
              statLabel: 'Deploy time',
              color: 'green',
            },
            {
              icon: 'shield',
              title: 'Security',
              body: 'SOC 2 compliant infrastructure.',
              statValue: '99.99%',
              statLabel: 'Uptime',
              color: 'blue',
            },
            {
              icon: 'chart',
              title: 'Analytics',
              body: 'Real-time metrics and dashboards.',
              statValue: '10ms',
              statLabel: 'Latency',
              color: 'orange',
            },
          ]}
        />
      </div>
    ),
  },
  {
    name: 'ColorPalette',
    description: 'CentrexStyle brand color display with copy functionality.',
    component: <ColorPalette showValues={true} showUsage={true} interactive={true} />,
  },
];

export default function ComponentLibraryPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3dae2b] to-[#3dae2b]/50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e5e5e5]">Component Library</h1>
                <p className="text-sm text-[#525252]">CentrexStyle components for generative UI</p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              <a
                href="/admin/generative"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </a>
              <a
                href="/admin/generative/library"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3dae2b]/10 text-[#3dae2b] text-sm font-medium"
              >
                <BookOpen className="w-4 h-4" />
                Library
              </a>
              <a
                href="/admin/generative/saved"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] text-sm font-medium transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Saved
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Component Demos */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-16">
        {COMPONENT_DEMOS.map((demo) => (
          <section key={demo.name} className="space-y-6">
            <div className="border-b border-[#262626] pb-4">
              <h2 className="text-2xl font-bold text-[#e5e5e5]">{demo.name}</h2>
              <p className="text-[#a3a3a3] mt-1">{demo.description}</p>
            </div>
            <div className="flex justify-center p-8 bg-[#0a0a0a] rounded-xl border border-[#262626]">
              {demo.component}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
