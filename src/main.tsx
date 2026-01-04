import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initSentry } from './lib/sentry.ts';
import { initAnalytics } from './lib/analytics.ts';
import { initWebVitals } from './lib/web-vitals.ts';
import './index.css';

// Initialize error tracking, analytics, and performance monitoring
initSentry();
initAnalytics();
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
