/**
 * TypographyScale Component
 *
 * Displays typography tokens with live previews.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { TypographyToken } from '../schemas';
import { ANIMATION } from '@/lib/constants';

interface TypographyPreviewProps {
  style: TypographyToken;
}

function TypographyPreview({ style }: TypographyPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-lg border border-border"
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline">{style.name}</Badge>
        <span className="text-xs text-muted-foreground font-mono">
          {style.fontSize}px / {style.fontWeight}
        </span>
      </div>
      <p
        className="text-foreground"
        style={{
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSize}px`,
          fontWeight: style.fontWeight,
          lineHeight: `${style.lineHeight}px`,
          letterSpacing: `${style.letterSpacing}px`,
        }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>Family: {style.fontFamily}</span>
        <span>Weight: {style.fontWeight}</span>
        <span>Line Height: {style.lineHeight.toFixed(1)}px</span>
        {style.letterSpacing !== 0 && <span>Letter Spacing: {style.letterSpacing}px</span>}
      </div>
    </motion.div>
  );
}

interface TypographyScaleProps {
  typography: TypographyToken[];
}

export function TypographyScale({ typography }: TypographyScaleProps) {
  return (
    <div className="space-y-4">
      {typography.map((style, index) => (
        <motion.div
          key={style.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * ANIMATION.staggerDelay }}
        >
          <TypographyPreview style={style} />
        </motion.div>
      ))}
    </div>
  );
}
