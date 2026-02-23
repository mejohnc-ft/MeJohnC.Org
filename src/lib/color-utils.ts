/**
 * Shared color conversion utilities.
 *
 * Extracted from tailwind-generator.ts so tenant-theme.ts can
 * also convert admin-stored hex values to the HSL format
 * required by CSS custom properties.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/303
 */

/**
 * Convert a hex color string to HSL components.
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert a hex color to the space-separated HSL string used by
 * shadcn/ui CSS custom properties, e.g. `"239 84% 67%"`.
 *
 * Non-hex values (already in HSL format) are returned unchanged.
 */
export function hexToHslString(value: string): string {
  if (!value.startsWith("#")) return value;
  const { h, s, l } = hexToHSL(value);
  return `${h} ${s}% ${l}%`;
}
