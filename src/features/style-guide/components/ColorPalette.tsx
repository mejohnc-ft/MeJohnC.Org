/**
 * ColorPalette Component
 *
 * Displays a color palette with swatches that can be copied.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import type { ColorToken } from '../schemas';
import { ANIMATION } from '@/lib/constants';

interface ColorSwatchProps {
  color: ColorToken;
  onCopy: (value: string) => void;
}

function ColorSwatch({ color, onCopy }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(color.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group"
    >
      <div
        className="aspect-square rounded-lg shadow-sm border border-border cursor-pointer transition-transform hover:scale-105"
        style={{ backgroundColor: color.value }}
        onClick={handleCopy}
        title={`Click to copy ${color.value}`}
      />
      <div className="mt-2">
        <p className="text-sm font-medium text-foreground truncate">{color.name}</p>
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground font-mono">{color.value}</p>
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface ColorPaletteProps {
  colors: ColorToken[];
  groupByCategory?: boolean;
}

export function ColorPalette({ colors, groupByCategory = true }: ColorPaletteProps) {
  const handleCopyColor = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  if (!groupByCategory) {
    return (
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {colors.map((color) => (
          <ColorSwatch key={color.name} color={color} onCopy={handleCopyColor} />
        ))}
      </div>
    );
  }

  const grouped = colors.reduce(
    (acc, color) => {
      if (!acc[color.category]) {
        acc[color.category] = [];
      }
      acc[color.category].push(color);
      return acc;
    },
    {} as Record<string, ColorToken[]>
  );

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, categoryColors], index) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * ANIMATION.staggerDelay }}
        >
          <h3 className="text-lg font-semibold text-foreground capitalize mb-4">
            {category}
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {categoryColors.map((color) => (
              <ColorSwatch key={color.name} color={color} onCopy={handleCopyColor} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
