import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CTABlockProps {
  headline?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  layout?: 'banner' | 'centered' | 'split';
  backgroundColor?: 'primary' | 'secondary' | 'accent' | 'muted';
  textColor?: 'light' | 'dark';
}

export function CTABlock({
  headline = 'Ready to get started?',
  description = 'Join thousands of satisfied customers',
  buttonText = 'Sign Up Now',
  buttonLink = '#',
  secondaryButtonText,
  secondaryButtonLink,
  layout = 'banner',
  backgroundColor = 'primary',
  textColor = 'light',
}: CTABlockProps) {
  const bgColorClass = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
    muted: 'bg-muted',
  }[backgroundColor];

  const textColorClass = textColor === 'light' ? 'text-white' : 'text-foreground';

  return (
    <section className={cn('py-16 md:py-20', bgColorClass)}>
      <div className="container mx-auto px-4">
        <div
          className={cn({
            'text-center max-w-4xl mx-auto': layout === 'centered' || layout === 'banner',
            'grid md:grid-cols-2 gap-8 items-center': layout === 'split',
          })}
        >
          <div className={cn({ 'text-center md:text-left': layout === 'split' })}>
            <h2 className={cn('text-3xl md:text-4xl font-bold mb-4', textColorClass)}>
              {headline}
            </h2>
            {description && (
              <p className={cn('text-lg mb-8 opacity-90', textColorClass)}>{description}</p>
            )}
          </div>
          <div
            className={cn('flex flex-wrap gap-4', {
              'justify-center': layout === 'centered' || layout === 'banner',
              'justify-center md:justify-end': layout === 'split',
            })}
          >
            {buttonText && (
              <Button
                asChild
                size="lg"
                variant={textColor === 'light' ? 'secondary' : 'default'}
              >
                <a href={buttonLink}>{buttonText}</a>
              </Button>
            )}
            {secondaryButtonText && secondaryButtonLink && (
              <Button asChild size="lg" variant="outline">
                <a href={secondaryButtonLink}>{secondaryButtonText}</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
