/**
 * Generative UI Feature Schemas
 *
 * Defines the Zod schemas for the json-render component catalog.
 * These schemas constrain AI output to valid CentrexStyle components.
 *
 * @see https://json-render.dev/
 * @see docs/centrexstyle-demo.html
 */

import { z } from 'zod';

// ============================================
// CENTREXSTYLE COLOR PALETTE
// ============================================

/**
 * CentrexStyle brand colors (from official style guide)
 */
export const CentrexColorSchema = z.enum([
  'green',   // --centrex-primary: #3dae2b (PMS 361 C)
  'blue',    // --centrex-secondary: #0071ce (PMS 285 C)
  'orange',  // --centrex-tertiary: #ff8300 (PMS 151 C)
  'red',     // --centrex-accent: #e1251b (PMS 1795 C)
]);
export type CentrexColor = z.infer<typeof CentrexColorSchema>;

/**
 * Extended color options including neutrals
 */
export const ExtendedColorSchema = z.enum([
  'green', 'blue', 'orange', 'red',
  'light', 'dark', 'muted', 'primary', 'secondary', 'accent',
]);
export type ExtendedColor = z.infer<typeof ExtendedColorSchema>;

// ============================================
// LAYOUT OPTIONS
// ============================================

export const LayoutSchema = z.enum(['centered', 'left', 'right', 'split', 'grid', 'list', 'cards']);
export type Layout = z.infer<typeof LayoutSchema>;

export const AlignmentSchema = z.enum(['left', 'center', 'right']);
export type Alignment = z.infer<typeof AlignmentSchema>;

// ============================================
// COMPONENT CATALOG SCHEMAS
// ============================================

/**
 * StatCard - Hero statistic display with gradient accent
 */
export const StatCardPropsSchema = z.object({
  value: z.string().describe('The metric value to display (e.g., "1,234", "$50K", "99%")'),
  label: z.string().describe('Label describing the metric'),
  color: CentrexColorSchema.describe('Brand color for the gradient accent'),
  trend: z.enum(['up', 'down', 'flat']).optional().describe('Trend direction indicator'),
  trendValue: z.string().optional().describe('Trend percentage (e.g., "+12%")'),
});
export type StatCardProps = z.infer<typeof StatCardPropsSchema>;

/**
 * Hero - Full-width hero section
 */
export const HeroPropsSchema = z.object({
  headline: z.string().describe('Main headline text'),
  subheadline: z.string().optional().describe('Supporting subheadline'),
  layout: z.enum(['centered', 'left', 'right', 'split']).default('centered'),
  ctaText: z.string().optional().describe('Primary call-to-action button text'),
  ctaLink: z.string().optional().describe('Primary CTA link URL'),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  backgroundStyle: z.enum(['gradient', 'solid', 'image']).default('gradient'),
  textColor: z.enum(['light', 'dark']).default('light'),
});
export type HeroProps = z.infer<typeof HeroPropsSchema>;

/**
 * FeatureItem - Individual feature within a Features block
 */
export const FeatureItemSchema = z.object({
  icon: z.string().describe('Icon name (FontAwesome or Lucide)'),
  title: z.string(),
  description: z.string(),
});
export type FeatureItem = z.infer<typeof FeatureItemSchema>;

/**
 * Features - Feature grid or list
 */
export const FeaturesPropsSchema = z.object({
  layout: z.enum(['grid', 'list', 'cards']).default('grid'),
  items: z.array(FeatureItemSchema).min(1).max(12),
  columns: z.number().min(1).max(4).default(3),
});
export type FeaturesProps = z.infer<typeof FeaturesPropsSchema>;

/**
 * CommandItem - Individual command in a palette group
 */
export const CommandItemSchema = z.object({
  code: z.string().describe('Command code (e.g., "/deploy")'),
  description: z.string().describe('What the command does'),
  shortcut: z.string().optional().describe('Keyboard shortcut'),
});
export type CommandItem = z.infer<typeof CommandItemSchema>;

/**
 * CommandGroup - Grouped commands in the palette
 */
export const CommandGroupSchema = z.object({
  title: z.string(),
  icon: z.string().describe('Group icon'),
  commands: z.array(CommandItemSchema).min(1).max(10),
});
export type CommandGroup = z.infer<typeof CommandGroupSchema>;

/**
 * CommandPalette - Grouped command interface
 */
export const CommandPalettePropsSchema = z.object({
  groups: z.array(CommandGroupSchema).min(1).max(6),
});
export type CommandPaletteProps = z.infer<typeof CommandPalettePropsSchema>;

/**
 * CarouselCard - Individual card in 3D carousel
 */
export const CarouselCardSchema = z.object({
  icon: z.string(),
  title: z.string(),
  body: z.string(),
  statValue: z.string().optional(),
  statLabel: z.string().optional(),
  color: CentrexColorSchema.optional(),
});
export type CarouselCard = z.infer<typeof CarouselCardSchema>;

/**
 * Carousel3D - Flywheel-style rotating cards
 */
export const Carousel3DPropsSchema = z.object({
  cards: z.array(CarouselCardSchema).min(2).max(8),
  autoRotate: z.boolean().default(false),
  rotationSpeed: z.number().min(1).max(10).default(5),
});
export type Carousel3DProps = z.infer<typeof Carousel3DPropsSchema>;

/**
 * MetricChart - Data-bound chart visualization
 */
export const MetricChartPropsSchema = z.object({
  sourceId: z.string().uuid().optional().describe('Metrics source ID to bind to'),
  metricName: z.string().describe('Name of the metric to display'),
  chartType: z.enum(['line', 'bar', 'area', 'sparkline']).default('line'),
  timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('7d'),
  title: z.string().optional(),
  color: CentrexColorSchema.default('green'),
  showLegend: z.boolean().default(true),
});
export type MetricChartProps = z.infer<typeof MetricChartPropsSchema>;

/**
 * DataTable - Tabular data display
 */
export const DataTablePropsSchema = z.object({
  sourceId: z.string().uuid().optional().describe('Metrics source ID'),
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    align: AlignmentSchema.default('left'),
  })).min(1).max(10),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(10),
});
export type DataTableProps = z.infer<typeof DataTablePropsSchema>;

/**
 * StatGrid - Grid of stat cards
 */
export const StatGridPropsSchema = z.object({
  stats: z.array(StatCardPropsSchema).min(1).max(8),
  columns: z.number().min(1).max(4).default(4),
});
export type StatGridProps = z.infer<typeof StatGridPropsSchema>;

/**
 * ColorPalette - Brand color display
 */
export const ColorPalettePropsSchema = z.object({
  showValues: z.boolean().default(true),
  showUsage: z.boolean().default(true),
  interactive: z.boolean().default(true),
});
export type ColorPaletteProps = z.infer<typeof ColorPalettePropsSchema>;

// ============================================
// COMPONENT CATALOG (for json-render)
// ============================================

/**
 * All available component types in the catalog
 */
export const ComponentTypeSchema = z.enum([
  'StatCard',
  'StatGrid',
  'Hero',
  'Features',
  'CommandPalette',
  'Carousel3D',
  'MetricChart',
  'DataTable',
  'ColorPalette',
]);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

/**
 * Component props union - discriminated by type
 */
export const ComponentPropsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('StatCard'), props: StatCardPropsSchema }),
  z.object({ type: z.literal('StatGrid'), props: StatGridPropsSchema }),
  z.object({ type: z.literal('Hero'), props: HeroPropsSchema }),
  z.object({ type: z.literal('Features'), props: FeaturesPropsSchema }),
  z.object({ type: z.literal('CommandPalette'), props: CommandPalettePropsSchema }),
  z.object({ type: z.literal('Carousel3D'), props: Carousel3DPropsSchema }),
  z.object({ type: z.literal('MetricChart'), props: MetricChartPropsSchema }),
  z.object({ type: z.literal('DataTable'), props: DataTablePropsSchema }),
  z.object({ type: z.literal('ColorPalette'), props: ColorPalettePropsSchema }),
]);
export type ComponentProps = z.infer<typeof ComponentPropsSchema>;

// ============================================
// GENERATIVE UI OUTPUT SCHEMA
// ============================================

/**
 * Single component node in the generated UI tree
 */
export const UINodeSchema: z.ZodType<UINode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: ComponentTypeSchema,
    props: z.record(z.unknown()),
    children: z.array(UINodeSchema).optional(),
    dataBinding: z.string().optional().describe('JSON Pointer path for data binding'),
  })
);

export interface UINode {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  children?: UINode[];
  dataBinding?: string;
}

/**
 * Complete generated UI layout
 */
export const GeneratedUISchema = z.object({
  title: z.string().optional().describe('Title for the generated panel'),
  description: z.string().optional().describe('Description of what this UI shows'),
  layout: z.enum(['stack', 'grid', 'flex']).default('stack'),
  nodes: z.array(UINodeSchema),
  theme: z.enum(['dark', 'light']).default('dark'),
  createdAt: z.string().optional(),
});
export type GeneratedUI = z.infer<typeof GeneratedUISchema>;

// ============================================
// GENERATION REQUEST/RESPONSE
// ============================================

/**
 * Request to generate UI from a prompt
 */
export const GenerateUIRequestSchema = z.object({
  prompt: z.string().min(1).describe('Natural language description of desired UI'),
  context: z.object({
    brandId: z.string().uuid().optional().describe('Brand to use for styling'),
    availableDataSources: z.array(z.string()).optional().describe('Available metric source IDs'),
    existingComponents: z.array(z.string()).optional().describe('Components already on page'),
  }).optional(),
  maxComponents: z.number().min(1).max(20).default(10),
  stream: z.boolean().default(true),
});
export type GenerateUIRequest = z.infer<typeof GenerateUIRequestSchema>;

/**
 * Saved generative panel configuration
 */
export const GenerativePanelSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  prompt: z.string(),
  generated_ui: GeneratedUISchema,
  is_published: z.boolean().default(false),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GenerativePanel = z.infer<typeof GenerativePanelSchema>;
