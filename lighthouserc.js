module.exports = {
  ci: {
    collect: {
      // Run against built site
      staticDistDir: './dist',
      // URLs to test
      url: [
        'http://localhost/',
        'http://localhost/portfolio',
        'http://localhost/about',
      ],
      // Number of runs per URL
      numberOfRuns: 3,
    },
    assert: {
      // Performance budgets
      assertions: {
        // Performance metrics
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Resource sizes
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }],
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 100000 }],
        'resource-summary:document:size': ['warn', { maxNumericValue: 50000 }],

        // Accessibility
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-description': 'error',

        // Best practices
        'uses-https': 'off', // Disabled for local testing
        'no-vulnerable-libraries': 'error',

        // SEO
        'canonical': 'error',
        'robots-txt': 'error',
        'crawlable-anchors': 'error',
      },
    },
    upload: {
      // Upload to temporary public storage (free)
      target: 'temporary-public-storage',
    },
  },
};
