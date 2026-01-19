import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface HeroBlockProps {
  layout?: 'centered' | 'left' | 'right' | 'split';
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundImage?: string;
  backgroundOverlay?: boolean;
  overlayOpacity?: number;
  textColor?: 'light' | 'dark';
  alignment?: 'left' | 'center' | 'right';
}

export function HeroBlock({
  layout = 'centered',
  headline = 'Welcome to Our Site',
  subheadline = 'Build amazing things with ease',
  ctaText = 'Get Started',
  ctaLink = '#',
  secondaryCtaText,
  secondaryCtaLink,
  backgroundImage,
  backgroundOverlay = true,
  overlayOpacity = 0.5,
  textColor = 'light',
  alignment = 'center',
}: HeroBlockProps) {
  const textColorClass = textColor === 'light' ? 'text-white' : 'text-gray-900';
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
          {backgroundOverlay && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlayOpacity }}
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        <div
          className={cn('max-w-4xl mx-auto', {
            'ml-0': layout === 'left',
            'mr-0': layout === 'right',
          })}
        >
          <div className={cn(alignmentClass, textColorClass)}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{headline}</h1>
            {subheadline && (
              <p className="text-xl md:text-2xl mb-8 opacity-90">{subheadline}</p>
            )}
            <div className={cn('flex flex-wrap gap-4', {
              'justify-center': alignment === 'center',
              'justify-start': alignment === 'left',
              'justify-end': alignment === 'right',
            })}>
              {ctaText && (
                <Button asChild size="lg">
                  <a href={ctaLink}>{ctaText}</a>
                </Button>
              )}
              {secondaryCtaText && secondaryCtaLink && (
                <Button asChild variant="outline" size="lg">
                  <a href={secondaryCtaLink}>{secondaryCtaText}</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
