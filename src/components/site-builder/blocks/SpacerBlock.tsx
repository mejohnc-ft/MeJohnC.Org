export interface SpacerBlockProps {
  height?: 'small' | 'medium' | 'large' | 'xlarge';
}

export function SpacerBlock({ height = 'medium' }: SpacerBlockProps) {
  const heightClass = {
    small: 'h-8',
    medium: 'h-16',
    large: 'h-24',
    xlarge: 'h-32',
  }[height];

  return <div className={heightClass} />;
}
