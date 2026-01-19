import { cn } from '@/lib/utils';

export interface DividerBlockProps {
  style?: 'solid' | 'dashed' | 'dotted' | 'gradient';
  width?: 'full' | 'contained' | 'narrow';
  color?: string;
  thickness?: number;
}

export function DividerBlock({
  style = 'solid',
  width = 'full',
  color = 'border',
  thickness = 1,
}: DividerBlockProps) {
  const widthClass = {
    full: 'w-full',
    contained: 'max-w-5xl mx-auto',
    narrow: 'max-w-3xl mx-auto',
  }[width];

  if (style === 'gradient') {
    return (
      <div className="py-8">
        <div className={cn('container mx-auto px-4', widthClass)}>
          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
            style={{ height: `${thickness}px` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className={cn('container mx-auto px-4', widthClass)}>
        <hr
          className={cn('border-border', {
            'border-dashed': style === 'dashed',
            'border-dotted': style === 'dotted',
          })}
          style={{ borderWidth: `${thickness}px`, borderColor: color }}
        />
      </div>
    </div>
  );
}
