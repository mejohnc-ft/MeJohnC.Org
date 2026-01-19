import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteBuilderPageComponent } from '@/lib/schemas';
import { BLOCK_COMPONENTS } from './blocks';

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: SiteBuilderPageComponent[];
  pageTitle: string;
}

export function PreviewModal({ isOpen, onClose, components, pageTitle }: PreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Preview: {pageTitle}</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Close Preview
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="bg-background">
            {components.length === 0 ? (
              <div className="container mx-auto px-4 py-20 text-center">
                <p className="text-muted-foreground">No components to preview</p>
              </div>
            ) : (
              <div>
                {components.map((component) => {
                  const Component = BLOCK_COMPONENTS[component.component_type as keyof typeof BLOCK_COMPONENTS];

                  if (!Component) {
                    return (
                      <div key={component.id} className="p-4 bg-destructive/10 text-destructive">
                        Unknown component type: {component.component_type}
                      </div>
                    );
                  }

                  return <Component key={component.id} {...(component.props as Record<string, unknown>)} />;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
