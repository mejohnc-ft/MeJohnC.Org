import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Trash2,
  Bot,
  User as UserIcon,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useReducedMotion } from "@/lib/reduced-motion";
import { getAuditEvents } from "@/lib/audit-queries";
import type { AuditLogEntry } from "@/lib/schemas";

import { MENU_BAR_HEIGHT } from "@/lib/desktop-constants";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const entryDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (entryDate.getTime() === today.getTime()) return "Today";
  if (entryDate.getTime() === yesterday.getTime()) return "Yesterday";
  return "Earlier";
}

function getActionIcon(actorType: string) {
  switch (actorType) {
    case "agent":
      return <Bot className="w-3.5 h-3.5" />;
    case "system":
      return <Zap className="w-3.5 h-3.5" />;
    case "scheduler":
      return <Clock className="w-3.5 h-3.5" />;
    default:
      return <UserIcon className="w-3.5 h-3.5" />;
  }
}

function formatAction(entry: AuditLogEntry): string {
  const parts = [entry.action];
  if (entry.resource_type) parts.push(`on ${entry.resource_type}`);
  return parts.join(" ");
}

export default function NotificationCenter({
  isOpen,
  onClose,
}: NotificationCenterProps) {
  const prefersReducedMotion = useReducedMotion();
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  // Fetch events when panel opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(false);
      try {
        const data = await getAuditEvents({ limit: 20 });
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, loadKey]);

  const handleClearAll = useCallback(() => {
    setEvents([]);
  }, []);

  // Group by date
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, AuditLogEntry[]>();
    const order = ["Today", "Yesterday", "Earlier"];
    for (const group of order) groups.set(group, []);
    for (const event of events) {
      const group = getDateGroup(event.timestamp);
      const existing = groups.get(group) ?? [];
      existing.push(event);
      groups.set(group, existing);
    }
    // Remove empty groups
    for (const [key, value] of groups) {
      if (value.length === 0) groups.delete(key);
    }
    return groups;
  }, [events]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-notification-center]") &&
        !target.closest("[data-notification-toggle]")
      ) {
        onClose();
      }
    };
    // Delay to avoid closing from the same click that opened
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  const slideMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: 320 },
        animate: { x: 0 },
        exit: { x: 320 },
        transition: { type: "spring", damping: 25, stiffness: 300 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...slideMotion}
          data-notification-center
          className="fixed right-0 w-80 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl overflow-hidden flex flex-col"
          style={{
            zIndex: 60,
            top: MENU_BAR_HEIGHT,
            height: `calc(100vh - ${MENU_BAR_HEIGHT}px)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Notifications
              </span>
            </div>
            {events.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mb-2 text-amber-500 opacity-60" />
                <span className="text-sm mb-2">
                  Failed to load notifications
                </span>
                <button
                  onClick={() => setLoadKey((k) => k + 1)}
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-sm">No notifications</span>
              </div>
            ) : (
              Array.from(groupedEvents.entries()).map(
                ([group, groupEvents]) => (
                  <div key={group}>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </div>
                    {groupEvents.map((event) => (
                      <div
                        key={event.id}
                        className="px-4 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-default"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-muted-foreground shrink-0">
                            {getActionIcon(event.actor_type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-foreground leading-relaxed">
                              {formatAction(event)}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {formatRelativeTime(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
