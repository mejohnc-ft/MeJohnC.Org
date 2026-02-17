import { ReactNode } from 'react';

/**
 * Wraps admin page content when rendered inside a desktop window.
 * Provides the same padding/layout that AdminLayout's <main> gives,
 * so pages look identical in both classic and desktop mode.
 */
export default function DesktopAppWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      {children}
    </div>
  );
}
