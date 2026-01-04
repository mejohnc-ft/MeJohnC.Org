#!/usr/bin/env node
/**
 * OG Image Generator
 * Converts og-image.svg to og-image.png for social media compatibility.
 *
 * Prerequisites:
 *   npm install sharp
 *
 * Usage:
 *   node scripts/generate-og-image.js
 *
 * Note: Most social platforms (Twitter, Facebook, LinkedIn) require PNG/JPG
 * for Open Graph images. SVG is not widely supported.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateOgImage() {
  try {
    // Try to use sharp for high-quality conversion
    const sharp = await import('sharp').catch(() => null);

    if (!sharp) {
      console.log(`
[OG Image] Sharp not installed. To generate og-image.png:

Option 1: Install sharp and run this script
  npm install sharp --save-dev
  node scripts/generate-og-image.js

Option 2: Convert manually
  - Open public/og-image.svg in a browser
  - Take a screenshot at 1200x630 resolution
  - Save as public/og-image.png

Option 3: Use online converter
  - https://cloudconvert.com/svg-to-png
  - Upload public/og-image.svg
  - Set dimensions to 1200x630
  - Download and save to public/og-image.png
`);
      return;
    }

    const svgPath = resolve(__dirname, '../public/og-image.svg');
    const pngPath = resolve(__dirname, '../public/og-image.png');

    const svgContent = readFileSync(svgPath);

    await sharp.default(svgContent)
      .resize(1200, 630)
      .png({ quality: 90 })
      .toFile(pngPath);

    console.log('[OG Image] Successfully generated og-image.png');
  } catch (error) {
    console.error('[OG Image] Error:', error.message);
  }
}

generateOgImage();
