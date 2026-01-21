/**
 * UIRenderer Component
 *
 * Renders generated UI JSON into React components.
 * Maps component types to CentrexStyle implementations.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { GeneratedUI, UINode, ComponentType } from '../schemas';

// Import all renderable components
import { StatCard } from './StatCard';
import { StatGrid } from './StatGrid';
import { CommandPalette } from './CommandPalette';
import { Carousel3D } from './Carousel3D';
import { MetricChart } from './MetricChart';
import { ColorPalette } from './ColorPalette';
import { DataTable } from './DataTable';

// Existing site builder components
import { HeroBlock } from '@/components/site-builder/blocks/HeroBlock';
import { FeaturesBlock } from '@/components/site-builder/blocks/FeaturesBlock';

// Component registry mapping types to React components
const COMPONENT_REGISTRY: Record<ComponentType, React.ComponentType<any>> = {
  StatCard,
  StatGrid,
  Hero: HeroBlock,
  Features: FeaturesBlock,
  CommandPalette,
  Carousel3D,
  MetricChart,
  DataTable,
  ColorPalette,
};

interface UINodeRendererProps {
  node: UINode;
  dataContext?: Record<string, unknown>;
}

/**
 * Renders a single UI node and its children
 */
function UINodeRenderer({ node, dataContext }: UINodeRendererProps) {
  const Component = COMPONENT_REGISTRY[node.type];

  if (!Component) {
    console.warn(`Unknown component type: ${node.type}`);
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded p-4 text-red-400">
        Unknown component: {node.type}
      </div>
    );
  }

  // Resolve data bindings if present
  const resolvedProps = useMemo(() => {
    if (!node.dataBinding || !dataContext) {
      return node.props;
    }

    // Simple JSON Pointer resolution
    const path = node.dataBinding.split('/').filter(Boolean);
    let value: unknown = dataContext;
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }

    return { ...node.props, boundData: value };
  }, [node.props, node.dataBinding, dataContext]);

  return (
    <div className="ui-node" data-node-id={node.id} data-node-type={node.type}>
      <Component {...resolvedProps}>
        {node.children?.map((child) => (
          <UINodeRenderer key={child.id} node={child} dataContext={dataContext} />
        ))}
      </Component>
    </div>
  );
}

interface UIRendererProps {
  ui: GeneratedUI;
  dataContext?: Record<string, unknown>;
  className?: string;
}

/**
 * Main renderer for generated UI layouts
 */
export function UIRenderer({ ui, dataContext, className }: UIRendererProps) {
  const layoutClass = {
    stack: 'flex flex-col gap-6',
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    flex: 'flex flex-wrap gap-6',
  }[ui.layout];

  return (
    <div
      className={cn(
        'ui-renderer min-h-screen p-6',
        ui.theme === 'dark' ? 'bg-[#050505] text-[#e5e5e5]' : 'bg-white text-gray-900',
        className
      )}
    >
      {/* Title & Description */}
      {(ui.title || ui.description) && (
        <div className="mb-8 text-center">
          {ui.title && (
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-[#a3a3a3] bg-clip-text text-transparent">
              {ui.title}
            </h1>
          )}
          {ui.description && (
            <p className="text-[#a3a3a3] max-w-2xl mx-auto">{ui.description}</p>
          )}
        </div>
      )}

      {/* Rendered Nodes */}
      <div className={cn(layoutClass)}>
        {ui.nodes.map((node) => (
          <UINodeRenderer key={node.id} node={node} dataContext={dataContext} />
        ))}
      </div>
    </div>
  );
}

export default UIRenderer;
