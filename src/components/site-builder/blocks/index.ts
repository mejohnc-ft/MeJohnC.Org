export { HeroBlock, type HeroBlockProps } from './HeroBlock';
export { FeaturesBlock, type FeaturesBlockProps } from './FeaturesBlock';
export { CTABlock, type CTABlockProps } from './CTABlock';
export { TextBlock, type TextBlockProps } from './TextBlock';
export { ImageBlock, type ImageBlockProps } from './ImageBlock';
export { SpacerBlock, type SpacerBlockProps } from './SpacerBlock';
export { DividerBlock, type DividerBlockProps } from './DividerBlock';
export { GenerativeBlock, type GenerativeBlockProps } from './GenerativeBlock';

// Block type registry for the editor
export const BLOCK_COMPONENTS = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CTABlock,
  text: TextBlock,
  image: ImageBlock,
  spacer: SpacerBlock,
  divider: DividerBlock,
  generative: GenerativeBlock,
} as const;

export type BlockType = keyof typeof BLOCK_COMPONENTS;
