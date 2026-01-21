/**
 * Generative UI Service
 *
 * Handles AI-powered UI generation using Claude and json-render patterns.
 * Supports both mock generation (for development) and real AI generation.
 */

import type { GeneratedUI } from '../schemas';

// ============================================
// TYPES
// ============================================

export interface GenerationResult {
  success: boolean;
  ui?: GeneratedUI;
  error?: string;
  tokensUsed?: number;
  generationTimeMs?: number;
}

export interface GenerationContext {
  brandId?: string;
  availableDataSources?: string[];
  designTokens?: {
    colors: { name: string; value: string }[];
    typography: { name: string; value: string }[];
  };
  existingComponents?: string[];
}

// ============================================
// SYSTEM PROMPT FOR AI GENERATION
// ============================================

const SYSTEM_PROMPT = `You are a UI generation assistant that creates JSON layouts using the CentrexStyle design system.

AVAILABLE COMPONENTS:
1. StatCard - KPI display with value, label, color (green|blue|orange|red), trend (up|down|flat), trendValue
2. StatGrid - Grid of StatCards with stats array and columns (1-4)
3. Hero - Hero section with headline, subheadline, layout, ctaText, ctaLink
4. Features - Feature grid with layout, items (icon, title, description), columns
5. CommandPalette - Grouped commands with groups (title, icon, commands)
6. Carousel3D - 3D rotating cards with cards array, autoRotate, rotationSpeed
7. MetricChart - Data chart with metricName, chartType (line|bar|area), timeRange, color
8. DataTable - Table with columns, sortBy, limit
9. ColorPalette - Brand colors with showValues, showUsage, interactive

CENTREXSTYLE COLORS:
- green: #3dae2b (primary, CTAs, success)
- blue: #0071ce (secondary, links, info)
- orange: #ff8300 (tertiary, warnings)
- red: #e1251b (accent, errors, destructive)

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
  "title": "Panel Title",
  "description": "Optional description",
  "layout": "stack" | "grid" | "flex",
  "theme": "dark" | "light",
  "nodes": [
    {
      "id": "unique-id",
      "type": "ComponentType",
      "props": { ...component props }
    }
  ]
}

RULES:
1. Always use valid component types from the list above
2. Use CentrexStyle colors consistently
3. Generate realistic placeholder data that matches the request
4. Keep layouts clean and focused
5. Return ONLY the JSON, no markdown or explanation`;

// ============================================
// MOCK GENERATION (Development)
// ============================================

/**
 * Generate UI using mock data (for development/demo)
 */
export async function generateMockUI(prompt: string): Promise<GeneratedUI> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

  const promptLower = prompt.toLowerCase();
  let result: GeneratedUI;

  // Dashboard with stats
  if (promptLower.includes('dashboard') || promptLower.includes('kpi') || promptLower.includes('stats') || promptLower.includes('metrics')) {
    result = {
      title: 'Performance Dashboard',
      description: 'Real-time metrics overview',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'stat-grid-1',
          type: 'StatGrid',
          props: {
            columns: 4,
            stats: [
              { value: '$52.4K', label: 'Revenue', color: 'green', trend: 'up', trendValue: '+12.5%' },
              { value: '2,847', label: 'Active Users', color: 'blue', trend: 'up', trendValue: '+8.2%' },
              { value: '1,234', label: 'Orders', color: 'orange', trend: 'up', trendValue: '+23.1%' },
              { value: '94.2%', label: 'Conversion', color: 'red', trend: 'down', trendValue: '-2.4%' },
            ],
          },
        },
        {
          id: 'chart-1',
          type: 'MetricChart',
          props: {
            metricName: 'Revenue',
            chartType: 'area',
            timeRange: '7d',
            color: 'green',
            title: 'Revenue Trend',
          },
        },
      ],
    };
  }
  // Command palette
  else if (promptLower.includes('command') || promptLower.includes('palette') || promptLower.includes('operations')) {
    result = {
      title: 'Command Center',
      description: 'Quick access to all operations',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'cmd-palette-1',
          type: 'CommandPalette',
          props: {
            groups: [
              {
                title: 'Deployment',
                icon: 'rocket',
                commands: [
                  { code: '/deploy', description: 'Deploy to production' },
                  { code: '/rollback', description: 'Rollback last deploy' },
                  { code: '/preview', description: 'Preview changes' },
                ],
              },
              {
                title: 'Database',
                icon: 'database',
                commands: [
                  { code: '/migrate', description: 'Run migrations' },
                  { code: '/backup', description: 'Create backup' },
                  { code: '/restore', description: 'Restore from backup' },
                ],
              },
              {
                title: 'Monitoring',
                icon: 'chart',
                commands: [
                  { code: '/status', description: 'System status' },
                  { code: '/logs', description: 'View logs' },
                  { code: '/alerts', description: 'Configure alerts' },
                ],
              },
            ],
          },
        },
      ],
    };
  }
  // Carousel/showcase
  else if (promptLower.includes('carousel') || promptLower.includes('showcase') || promptLower.includes('product')) {
    result = {
      title: 'Product Features',
      description: 'Explore what we offer',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'carousel-1',
          type: 'Carousel3D',
          props: {
            autoRotate: true,
            rotationSpeed: 5,
            cards: [
              {
                icon: 'rocket',
                title: 'Fast Deployment',
                body: 'Deploy your applications in seconds with our streamlined CI/CD pipeline.',
                statValue: '< 30s',
                statLabel: 'Average deploy time',
                color: 'green',
              },
              {
                icon: 'shield',
                title: 'Enterprise Security',
                body: 'SOC 2 compliant infrastructure with end-to-end encryption.',
                statValue: '99.99%',
                statLabel: 'Uptime SLA',
                color: 'blue',
              },
              {
                icon: 'chart',
                title: 'Real-time Analytics',
                body: 'Monitor your applications with live metrics and custom dashboards.',
                statValue: '10ms',
                statLabel: 'Latency',
                color: 'orange',
              },
              {
                icon: 'users',
                title: 'Team Collaboration',
                body: 'Work together seamlessly with role-based access control.',
                statValue: '∞',
                statLabel: 'Team members',
                color: 'green',
              },
            ],
          },
        },
      ],
    };
  }
  // Color palette
  else if (promptLower.includes('color') || promptLower.includes('palette') || promptLower.includes('brand')) {
    result = {
      title: 'Brand Colors',
      description: 'CentrexStyle official color palette',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'colors-1',
          type: 'ColorPalette',
          props: {
            showValues: true,
            showUsage: true,
            interactive: true,
          },
        },
      ],
    };
  }
  // Hero/landing
  else if (promptLower.includes('hero') || promptLower.includes('landing') || promptLower.includes('homepage')) {
    result = {
      title: 'Landing Page',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'hero-1',
          type: 'Hero',
          props: {
            headline: 'Build Faster, Ship Smarter',
            subheadline: 'The modern platform for teams that move fast without breaking things.',
            layout: 'centered',
            ctaText: 'Get Started Free',
            ctaLink: '/signup',
            secondaryCtaText: 'View Demo',
            secondaryCtaLink: '/demo',
          },
        },
        {
          id: 'features-1',
          type: 'Features',
          props: {
            layout: 'grid',
            columns: 3,
            items: [
              { icon: 'Zap', title: 'Lightning Fast', description: 'Optimized for speed at every level of the stack.' },
              { icon: 'Shield', title: 'Secure by Default', description: 'Enterprise-grade security built-in from day one.' },
              { icon: 'Users', title: 'Team Ready', description: 'Collaborate with unlimited team members.' },
            ],
          },
        },
      ],
    };
  }
  // Table/data
  else if (promptLower.includes('table') || promptLower.includes('data') || promptLower.includes('list')) {
    result = {
      title: 'Data Overview',
      description: 'Recent activity and records',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'stats-1',
          type: 'StatGrid',
          props: {
            columns: 3,
            stats: [
              { value: '1,234', label: 'Total Records', color: 'green' },
              { value: '89', label: 'New Today', color: 'blue' },
              { value: '12', label: 'Pending', color: 'orange' },
            ],
          },
        },
        {
          id: 'table-1',
          type: 'DataTable',
          props: {
            columns: [
              { key: 'id', label: 'ID', align: 'left' },
              { key: 'name', label: 'Name', align: 'left' },
              { key: 'status', label: 'Status', align: 'center' },
              { key: 'date', label: 'Date', align: 'right' },
            ],
            limit: 10,
            sortBy: 'date',
            sortDirection: 'desc',
          },
        },
      ],
    };
  }
  // Chart focus
  else if (promptLower.includes('chart') || promptLower.includes('graph') || promptLower.includes('trend')) {
    result = {
      title: 'Analytics',
      description: 'Performance over time',
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'chart-line',
          type: 'MetricChart',
          props: {
            metricName: 'Performance',
            chartType: 'line',
            timeRange: '7d',
            color: 'green',
            title: 'Weekly Performance',
          },
        },
        {
          id: 'chart-bar',
          type: 'MetricChart',
          props: {
            metricName: 'Conversions',
            chartType: 'bar',
            timeRange: '30d',
            color: 'blue',
            title: 'Monthly Conversions',
          },
        },
      ],
    };
  }
  // Default: combined dashboard
  else {
    result = {
      title: 'Generated Panel',
      description: `Created from: "${prompt.slice(0, 50)}..."`,
      layout: 'stack',
      theme: 'dark',
      nodes: [
        {
          id: 'stat-1',
          type: 'StatCard',
          props: {
            value: '42',
            label: 'Generated Metric',
            color: 'green',
            trend: 'up',
            trendValue: '+5%',
          },
        },
        {
          id: 'chart-1',
          type: 'MetricChart',
          props: {
            metricName: 'Activity',
            chartType: 'area',
            timeRange: '7d',
            color: 'green',
          },
        },
      ],
    };
  }

  result.createdAt = new Date().toISOString();
  return result;
}

// ============================================
// REAL AI GENERATION (Production)
// ============================================

/**
 * Generate UI using Claude API
 *
 * Requires VITE_ANTHROPIC_API_KEY environment variable
 */
export async function generateWithClaude(
  prompt: string,
  context?: GenerationContext
): Promise<GenerationResult> {
  const startTime = Date.now();
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('No Anthropic API key found, falling back to mock generation');
    const ui = await generateMockUI(prompt);
    return {
      success: true,
      ui,
      generationTimeMs: Date.now() - startTime,
    };
  }

  try {
    // Build context-aware prompt
    let contextPrompt = '';
    if (context?.designTokens) {
      contextPrompt += `\nAvailable brand colors: ${context.designTokens.colors.map(c => c.name).join(', ')}`;
    }
    if (context?.availableDataSources?.length) {
      contextPrompt += `\nAvailable data sources: ${context.availableDataSources.join(', ')}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate a UI layout for the following request:

${prompt}
${contextPrompt}

Return ONLY valid JSON, no markdown formatting.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const ui = JSON.parse(jsonMatch[0]) as GeneratedUI;
    ui.createdAt = new Date().toISOString();

    return {
      success: true,
      ui,
      tokensUsed: data.usage?.output_tokens || 0,
      generationTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Claude generation failed:', error);

    // Fallback to mock generation
    const ui = await generateMockUI(prompt);
    return {
      success: true,
      ui,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================
// STREAMING GENERATION
// ============================================

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (ui: GeneratedUI) => void;
  onError?: (error: Error) => void;
}

/**
 * Generate UI with streaming response
 */
export async function generateWithStreaming(
  prompt: string,
  context?: GenerationContext,
  callbacks?: StreamCallbacks
): Promise<GenerationResult> {
  callbacks?.onStart?.();

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Mock streaming with delay
    const ui = await generateMockUI(prompt);
    callbacks?.onComplete?.(ui);
    return { success: true, ui };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate a UI layout for: ${prompt}\n\nReturn ONLY valid JSON.`,
          },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text || '';
            fullContent += text;
            callbacks?.onChunk?.(text);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in streamed response');
    }

    const ui = JSON.parse(jsonMatch[0]) as GeneratedUI;
    ui.createdAt = new Date().toISOString();

    callbacks?.onComplete?.(ui);
    return { success: true, ui };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks?.onError?.(err);

    // Fallback
    const ui = await generateMockUI(prompt);
    callbacks?.onComplete?.(ui);
    return { success: true, ui, error: err.message };
  }
}

// ============================================
// EXPORTS
// ============================================

export const generationService = {
  generateMock: generateMockUI,
  generateWithClaude,
  generateWithStreaming,
  SYSTEM_PROMPT,
};

export default generationService;
