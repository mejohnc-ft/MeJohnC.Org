import { cn } from '@/lib/utils';

export interface ImageBlockProps {
  src?: string;
  alt?: string;
  caption?: string;
  width?: 'full' | 'contained' | 'narrow';
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
  objectFit?: 'cover' | 'contain';
  rounded?: boolean;
}

export function ImageBlock({
  src = 'https://via.placeholder.com/1200x600',
  alt = 'Image',
  caption,
  width = 'contained',
  aspectRatio = '16/9',
  objectFit = 'cover',
  rounded = false,
}: ImageBlockProps) {
  const widthClass = {
    full: 'w-full',
    contained: 'max-w-5xl mx-auto',
    narrow: 'max-w-3xl mx-auto',
  }[width];

  const aspectRatioClass = aspectRatio !== 'auto' ? 'aspect-[var(--aspect)]' : '';
  const aspectRatioStyle = aspectRatio !== 'auto' ? { '--aspect': aspectRatio } as React.CSSProperties : {};

  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className={widthClass}>
          <div
            className={cn('relative overflow-hidden', {
              [aspectRatioClass]: aspectRatio !== 'auto',
              'rounded-lg': rounded,
            })}
            style={aspectRatioStyle}
          >
            <img
              src={src}
              alt={alt}
              className={cn('w-full h-full', {
                'object-cover': objectFit === 'cover',
                'object-contain': objectFit === 'contain',
              })}
            />
          </div>
          {caption && (
            <p className="text-sm text-muted-foreground text-center mt-4">{caption}</p>
          )}
        </div>
      </div>
    </section>
  );
}
