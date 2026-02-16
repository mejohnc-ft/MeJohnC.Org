import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer - generates stats.html when ANALYZE=true
    mode === 'analyze' &&
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // or 'sunburst', 'network'
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation library
          'vendor-framer': ['framer-motion'],
          // Charting library (large, lazy-loaded via dashboard)
          'vendor-recharts': ['recharts'],
          // Markdown processing - split for better caching
          'vendor-markdown-core': ['react-markdown'],
          'vendor-markdown-plugins': ['remark-gfm', 'rehype-highlight'],
          // UI utilities
          'vendor-ui': ['clsx', 'tailwind-merge', 'class-variance-authority', 'lucide-react'],
          // Auth
          'vendor-auth': ['@clerk/clerk-react'],
          // Database
          'vendor-supabase': ['@supabase/supabase-js'],
          // Ghost CMS (lazy loaded)
          'vendor-ghost': ['@tryghost/content-api'],
          // Security
          'vendor-security': ['dompurify'],
          // Monitoring (only loaded if configured)
          'vendor-monitoring': ['@sentry/react'],
        },
      },
    },
    // Increase warning limit for vendor chunks (recharts is ~365KB but cached/lazy-loaded)
    chunkSizeWarningLimit: 400,
    // Hidden source maps: generated for Sentry but not exposed to browsers
    sourcemap: 'hidden',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
}));
