import { cn } from '@/lib/utils';
import { Check, Star, Zap, Shield, Users, Heart } from 'lucide-react';

const iconMap = {
  check: Check,
  star: Star,
  zap: Zap,
  shield: Shield,
  users: Users,
  heart: Heart,
};

export interface FeatureItem {
  icon?: keyof typeof iconMap;
  title: string;
  description: string;
}

export interface FeaturesBlockProps {
  layout?: 'grid' | 'list' | 'cards';
  columns?: 2 | 3 | 4;
  items?: FeatureItem[];
  headline?: string;
  description?: string;
  showIcons?: boolean;
}

export function FeaturesBlock({
  layout = 'grid',
  columns = 3,
  items = [
    { icon: 'check', title: 'Feature One', description: 'Amazing feature description' },
    { icon: 'check', title: 'Feature Two', description: 'Another great feature' },
    { icon: 'check', title: 'Feature Three', description: 'One more feature' },
  ],
  headline = 'Features',
  description,
  showIcons = true,
}: FeaturesBlockProps) {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        {headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{headline}</h2>
            {description && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div
          className={cn('grid gap-8', {
            'grid-cols-1': layout === 'list',
            'grid-cols-1 md:grid-cols-2': columns === 2 && layout === 'grid',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': columns === 3 && layout === 'grid',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': columns === 4 && layout === 'grid',
          })}
        >
          {items.map((item, index) => {
            const Icon = item.icon ? iconMap[item.icon] : null;

            return (
              <div
                key={index}
                className={cn('group', {
                  'p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors':
                    layout === 'cards',
                  'flex gap-4': layout === 'list',
                })}
              >
                {showIcons && Icon && (
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                )}
                <div className={cn({ 'flex-1': layout === 'list' })}>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
