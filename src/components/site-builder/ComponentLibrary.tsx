import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteBuilderComponentTemplate } from '@/lib/schemas';

const componentCategories = {
  Heroes: ['hero'],
  Content: ['text', 'image'],
  Features: ['features'],
  CTAs: ['cta'],
  Layout: ['spacer', 'divider'],
};

export interface ComponentLibraryProps {
  templates: SiteBuilderComponentTemplate[];
  onAddComponent: (componentType: string, props: Record<string, unknown>) => void;
}

export function ComponentLibrary({ templates, onAddComponent }: ComponentLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Object.keys(componentCategories)];

  const filteredTemplates = templates.filter((template) => {
    if (selectedCategory === 'All') return true;
    const categoryTypes = componentCategories[selectedCategory as keyof typeof componentCategories];
    return categoryTypes?.includes(template.component_type);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Category Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 p-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap',
                {
                  'bg-primary text-primary-foreground': selectedCategory === category,
                  'hover:bg-accent': selectedCategory !== category,
                }
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onAddComponent(template.component_type, template.props)}
              className="w-full p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{template.name}</h4>
                  {template.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {template.description}
                    </p>
                  )}
                  <span className="inline-block text-xs text-muted-foreground mt-1 px-2 py-0.5 bg-muted rounded">
                    {template.component_type}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No components in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
