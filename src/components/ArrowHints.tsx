import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HORIZONTAL_SHOWN_KEY = 'arrow-hints-horizontal';
const VERTICAL_SHOWN_KEY = 'arrow-hints-vertical';

// Keyboard key style component
function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 bg-muted/50 border border-border/50 rounded text-xs font-mono text-muted-foreground">
      {children}
    </span>
  );
}

// Left arrow key - placed before nav items
export function LeftArrowHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem(HORIZONTAL_SHOWN_KEY);
    if (hasShown) return;

    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(HORIZONTAL_SHOWN_KEY, 'true');
      setTimeout(() => setShow(false), 5000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <motion.div
            animate={{ x: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: 3, ease: 'easeInOut' }}
          >
            <KeyCap>←</KeyCap>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Right arrow key - placed after nav items
export function RightArrowHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem(HORIZONTAL_SHOWN_KEY);
    if (hasShown) return;

    const timer = setTimeout(() => {
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <motion.div
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 0.8, repeat: 3, ease: 'easeInOut' }}
          >
            <KeyCap>→</KeyCap>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Down arrow key - placed below portfolio tabs
export function DownArrowHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem(VERTICAL_SHOWN_KEY);
    if (hasShown) return;

    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(VERTICAL_SHOWN_KEY, 'true');
      setTimeout(() => setShow(false), 5000);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="flex justify-center mt-4"
        >
          <motion.div
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 0.8, repeat: 3, ease: 'easeInOut' }}
          >
            <KeyCap>↓</KeyCap>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
