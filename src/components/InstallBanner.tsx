import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/lib/pwa';
import { Button } from '@/components/ui/button';

export function InstallBanner() {
  const { canInstall, installApp, dismiss } = usePWA();

  if (!canInstall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">
                Install App
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for quick access
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={installApp}
                  className="text-xs"
                >
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismiss}
                  className="text-xs"
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="flex-shrink-0 p-1 hover:bg-muted rounded-md transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
