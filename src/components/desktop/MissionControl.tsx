import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowManagerContext } from "./WindowManager";
import { getApp } from "./apps/AppRegistry";
import * as LucideIcons from "lucide-react";

interface MissionControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MissionControl({
  isOpen,
  onClose,
}: MissionControlProps) {
  const { state, focusWindow } = useWindowManagerContext();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const visibleWindows = state.windows.filter((w) => !w.minimized);
  const minimizedWindows = state.windows.filter((w) => w.minimized);

  const handleSelect = (id: string) => {
    focusWindow(id);
    onClose();
  };

  // Calculate grid layout
  const count = visibleWindows.length;
  const cols = count <= 2 ? count : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8"
          onClick={onClose}
        >
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-white/60 text-xs font-medium tracking-wider uppercase mb-6"
          >
            Mission Control
          </motion.div>

          {/* Window Grid */}
          {count === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-white/40 text-sm"
            >
              No open windows
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="grid gap-4 max-w-4xl w-full"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {visibleWindows.map((win) => {
                const app = getApp(win.appId);
                const IconComponent = app
                  ? (LucideIcons as Record<string, LucideIcons.LucideIcon>)[
                      app.icon
                    ]
                  : null;

                return (
                  <motion.button
                    key={win.id}
                    layoutId={`mc-${win.id}`}
                    onClick={() => handleSelect(win.id)}
                    className="group relative bg-card/80 border border-border/50 rounded-lg overflow-hidden hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Thumbnail area */}
                    <div className="aspect-[16/10] flex items-center justify-center bg-background/50 relative">
                      {IconComponent && (
                        <IconComponent
                          className={`w-10 h-10 ${app?.color ?? "text-muted-foreground"} opacity-30 group-hover:opacity-60 transition-opacity`}
                        />
                      )}
                      {win.id === state.focusedWindowId && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="p-2 flex items-center gap-2">
                      {IconComponent && (
                        <IconComponent
                          className={`w-3.5 h-3.5 ${app?.color ?? "text-muted-foreground"}`}
                        />
                      )}
                      <span className="text-xs text-foreground truncate font-medium">
                        {win.title}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Minimized windows row */}
          {minimizedWindows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 flex items-center gap-3"
            >
              <span className="text-white/30 text-[10px] uppercase tracking-wider">
                Minimized
              </span>
              {minimizedWindows.map((win) => {
                const app = getApp(win.appId);
                const IconComponent = app
                  ? (LucideIcons as Record<string, LucideIcons.LucideIcon>)[
                      app.icon
                    ]
                  : null;

                return (
                  <motion.button
                    key={win.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(win.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/50 border border-border/30 hover:border-primary/40 transition-all text-xs text-muted-foreground hover:text-foreground"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {IconComponent && (
                      <IconComponent
                        className={`w-3 h-3 ${app?.color ?? ""}`}
                      />
                    )}
                    {win.title}
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-white/20 text-[10px]"
          >
            Press Escape or click anywhere to dismiss
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
