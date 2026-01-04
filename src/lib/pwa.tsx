/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { captureException } from './sentry';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  installApp: () => Promise<boolean>;
  dismiss: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  canInstall: false,
  isInstalled: false,
  installApp: async () => false,
  dismiss: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone;
      setIsInstalled(isStandalone || Boolean(isIOSStandalone));
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', checkInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        return true;
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), { context: 'PWA.install' });
    }

    return false;
  };

  const dismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage for 7 days
    localStorage.setItem('pwa-dismissed', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  // Check if user dismissed the prompt recently
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('pwa-dismissed');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      setIsDismissed(true);
    }
  }, []);

  const canInstall = Boolean(deferredPrompt) && !isInstalled && !isDismissed;

  return (
    <PWAContext.Provider value={{ canInstall, isInstalled, installApp, dismiss }}>
      {children}
    </PWAContext.Provider>
  );
}
