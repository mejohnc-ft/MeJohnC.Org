/**
 * Generative UI Feature
 *
 * AI-powered UI generation using CentrexStyle components
 * and json-render patterns.
 *
 * @see https://json-render.dev/
 * @see docs/centrexstyle-demo.html
 */

// Module definition
export { generativeUIModule } from './module';

// Services
export { generationService, genuiQueries } from './services';
export type { GenerationResult, GenerationContext, CreatePanelInput, UpdatePanelInput } from './services';

// Hooks
export { useMetricsData, getAvailableMetricsSources } from './hooks';

// Schemas
export {
  // Color schemas
  CentrexColorSchema,
  type CentrexColor,
  ExtendedColorSchema,
  type ExtendedColor,
  // Layout schemas
  LayoutSchema,
  type Layout,
  AlignmentSchema,
  type Alignment,
  // Component prop schemas
  StatCardPropsSchema,
  type StatCardProps,
  StatGridPropsSchema,
  type StatGridProps,
  HeroPropsSchema,
  type HeroProps,
  FeatureItemSchema,
  type FeatureItem,
  FeaturesPropsSchema,
  type FeaturesProps,
  CommandItemSchema,
  type CommandItem,
  CommandGroupSchema,
  type CommandGroup,
  CommandPalettePropsSchema,
  type CommandPaletteProps,
  CarouselCardSchema,
  type CarouselCard,
  Carousel3DPropsSchema,
  type Carousel3DProps,
  MetricChartPropsSchema,
  type MetricChartProps,
  DataTablePropsSchema,
  type DataTableProps,
  ColorPalettePropsSchema,
  type ColorPaletteProps,
  // Catalog schemas
  ComponentTypeSchema,
  type ComponentType,
  ComponentPropsSchema,
  type ComponentProps,
  // Generated UI schemas
  UINodeSchema,
  type UINode,
  GeneratedUISchema,
  type GeneratedUI,
  // Request/Response schemas
  GenerateUIRequestSchema,
  type GenerateUIRequest,
  GenerativePanelSchema,
  type GenerativePanel,
} from './schemas';

// Components
export {
  StatCard,
  StatGrid,
  CommandPalette,
  Carousel3D,
  MetricChart,
  ColorPalette,
  UIRenderer,
  GenerativePanel,
} from './components';
