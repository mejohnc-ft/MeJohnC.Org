/**
 * Figma Adapter
 *
 * Encapsulates Figma API integration for extracting design tokens.
 * This adapter wraps the existing Figma API utilities and provides
 * a clean interface for the style service.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import {
  extractDesignTokens as extractTokensFromFigma,
  getFigmaFileInfo as getFigmaInfo,
  validateFigmaToken as validateToken,
  isFigmaConfigured as isConfigured,
} from '@/lib/figma-api';
import type { DesignTokens } from '../schemas';

/**
 * Figma file information
 */
export interface FigmaFileInfo {
  name: string;
  lastModified: string;
  version: string;
}

/**
 * Figma adapter for design token extraction
 */
export class FigmaAdapter {
  /**
   * Check if Figma is configured with a valid token
   */
  isConfigured(token?: string): boolean {
    return isConfigured(token);
  }

  /**
   * Validate a Figma access token
   */
  async validateToken(token: string): Promise<boolean> {
    return validateToken(token);
  }

  /**
   * Get information about a Figma file
   */
  async getFileInfo(fileKey: string, token: string): Promise<FigmaFileInfo> {
    return getFigmaInfo(fileKey, token);
  }

  /**
   * Extract design tokens from a Figma file
   */
  async extractDesignTokens(fileKey: string, token: string): Promise<DesignTokens> {
    const tokens = await extractTokensFromFigma(fileKey, token);
    return tokens as DesignTokens;
  }

  /**
   * Extract file key from a Figma URL
   */
  extractFileKeyFromUrl(url: string): string | null {
    // Figma URLs: https://www.figma.com/file/{FILE_KEY}/...
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
}
