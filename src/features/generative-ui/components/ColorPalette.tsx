/**
 * ColorPalette Component
 *
 * CentrexStyle brand color palette display.
 * Interactive color swatches with copy functionality.
 */

'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColorPaletteProps } from '../schemas';

const CENTREX_COLORS = [
  {
    name: 'Primary Green',
    hex: '#3dae2b',
    rgb: '61, 174, 43',
    pms: 'PMS 361 C',
    cssVar: '--centrex-primary',
    usage: 'Primary brand color. Use for CTAs, active states, and key highlights.',
  },
  {
    name: 'Secondary Blue',
    hex: '#0071ce',
    rgb: '0, 113, 206',
    pms: 'PMS 285 C',
    cssVar: '--centrex-secondary',
    usage: 'Secondary accent. Use for links, informational elements, and data visualizations.',
  },
  {
    name: 'Tertiary Orange',
    hex: '#ff8300',
    rgb: '255, 131, 0',
    pms: 'PMS 151 C',
    cssVar: '--centrex-tertiary',
    usage: 'Tertiary accent. Use for warnings, alerts, and attention-grabbing elements.',
  },
  {
    name: 'Accent Red',
    hex: '#e1251b',
    rgb: '225, 37, 27',
    pms: 'PMS 1795 C',
    cssVar: '--centrex-accent',
    usage: 'Accent color. Use sparingly for errors, critical alerts, and destructive actions.',
  },
];

export function ColorPalette({
  showValues = true,
  showUsage = true,
  interactive = true,
}: ColorPaletteProps) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copyToClipboard = async (value: string) => {
    if (!interactive) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {CENTREX_COLORS.map((color) => (
        <div
          key={color.name}
          className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden transition-transform hover:-translate-y-1 hover:border-[#3dae2b]"
        >
          {/* Color Swatch */}
          <div
            className="h-28 w-full relative group"
            style={{ backgroundColor: color.hex }}
          >
            {interactive && (
              <button
                onClick={() => copyToClipboard(color.hex)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
              >
                {copiedValue === color.hex ? (
                  <Check className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Copy className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )}
          </div>

          {/* Color Info */}
          <div className="p-5">
            <h4 className="text-lg font-bold text-[#e5e5e5] mb-2">
              {color.name}
            </h4>

            {showValues && (
              <div className="flex flex-col gap-1 text-sm font-mono text-[#a3a3a3] mb-3">
                <div
                  className={cn(
                    'flex justify-between px-2 py-1 rounded transition-colors',
                    interactive && 'cursor-pointer hover:bg-[#262626] hover:text-[#3dae2b]'
                  )}
                  onClick={() => copyToClipboard(color.hex)}
                >
                  <span>HEX</span>
                  <span className="flex items-center gap-1">
                    {color.hex}
                    {copiedValue === color.hex && <Check className="w-3 h-3" />}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex justify-between px-2 py-1 rounded transition-colors',
                    interactive && 'cursor-pointer hover:bg-[#262626] hover:text-[#3dae2b]'
                  )}
                  onClick={() => copyToClipboard(`rgb(${color.rgb})`)}
                >
                  <span>RGB</span>
                  <span className="flex items-center gap-1">
                    {color.rgb}
                    {copiedValue === `rgb(${color.rgb})` && <Check className="w-3 h-3" />}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex justify-between px-2 py-1 rounded transition-colors',
                    interactive && 'cursor-pointer hover:bg-[#262626] hover:text-[#3dae2b]'
                  )}
                  onClick={() => copyToClipboard(color.cssVar)}
                >
                  <span>VAR</span>
                  <span className="flex items-center gap-1">
                    {color.cssVar}
                    {copiedValue === color.cssVar && <Check className="w-3 h-3" />}
                  </span>
                </div>
              </div>
            )}

            {showUsage && (
              <p className="text-sm text-[#a3a3a3] border-t border-[#262626] pt-3 leading-relaxed">
                {color.usage}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ColorPalette;
