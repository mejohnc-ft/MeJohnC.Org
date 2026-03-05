import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useWindowManagerContext, useWorkspaceContext } from "./WindowManager";
import { getApp, getAppsForTenant, getLazyComponent } from "./apps/AppRegistry";
import { ArrowLeft, Search, Clock } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useTenant } from "@/lib/tenant";
import Spotlight from "./Spotlight";
import * as LucideIcons from "lucide-react";

// Mobile status bar
function MobileStatusBar({
  currentAppName,
  onSpotlightOpen,
}: {
  currentAppName: string | null;
  onSpotlightOpen: () => void;
}) {
  const formatTime = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  const [timeString, setTimeString] = useState(formatTime);

  useEffect(() => {
    const interval = setInterval(() => setTimeString(formatTime()), 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium truncate">
          {currentAppName || "Home"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {timeString}
        </div>
        <button
          onClick={onSpotlightOpen}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          aria-label="Open Spotlight"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Mobile app grid (home screen)
function MobileAppGrid({
  onAppClick,
}: {
  onAppClick: (appId: string) => void;
}) {
  const { plan } = useBilling();
  const { tenant } = useTenant();
  const enabledAppIds = (tenant?.settings as Record<string, unknown>)
    ?.enabled_apps as string[] | undefined;
  const apps = useMemo(
    () => getAppsForTenant(plan, enabledAppIds),
    [plan, enabledAppIds],
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-4 gap-4">
        {apps.map((app) => {
          const IconComponent =
            LucideIcons[app.icon as keyof typeof LucideIcons];
          return (
            <button
              key={app.id}
              onClick={() => onAppClick(app.id)}
              className="flex flex-col items-center gap-2 p-3 hover:bg-accent rounded-xl transition-colors active:scale-95"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${app.color} bg-opacity-10`}
              >
                {IconComponent && (
                  <IconComponent className={`w-7 h-7 ${app.color}`} />
                )}
              </div>
              <span className="text-xs text-center leading-tight line-clamp-2">
                {app.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Mobile tab bar (bottom navigation)
function MobileTabBar({
  onAppClick,
  activeAppId,
}: {
  onAppClick: (appId: string) => void;
  activeAppId: string | null;
}) {
  const workspace = useWorkspaceContext();
  const { plan } = useBilling();
  const { tenant } = useTenant();
  const enabledAppIds = (tenant?.settings as Record<string, unknown>)
    ?.enabled_apps as string[] | undefined;
  const planApps = useMemo(
    () => getAppsForTenant(plan, enabledAppIds),
    [plan, enabledAppIds],
  );
  const planAppIds = useMemo(
    () => new Set(planApps.map((a) => a.id)),
    [planApps],
  );

  // Get top 5 pinned apps
  const pinnedApps = useMemo(
    () =>
      workspace.dockItems
        .slice(0, 5)
        .map((id) => getApp(id))
        .filter((a): a is NonNullable<typeof a> => !!a && planAppIds.has(a.id)),
    [workspace.dockItems, planAppIds],
  );

  return (
    <div
      className="h-16 bg-card/80 backdrop-blur-md border-t border-border flex items-center justify-around px-2 sticky bottom-0 z-10"
      role="tablist"
    >
      {pinnedApps.map((app) => {
        const IconComponent = LucideIcons[app.icon as keyof typeof LucideIcons];
        const isActive = activeAppId === app.id;
        return (
          <button
            key={app.id}
            onClick={() => onAppClick(app.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-accent"
            }`}
            role="tab"
            aria-selected={isActive}
          >
            {IconComponent && <IconComponent className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{app.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// Full-screen app renderer
function MobileAppRenderer({ appId }: { appId: string }) {
  const app = getApp(appId);

  if (!app) return null;

  const AppComponent = getLazyComponent(app);

  return (
    <div className="flex-1 overflow-auto bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <AppComponent />
      </Suspense>
    </div>
  );
}

// Main mobile shell
export default function MobileShell() {
  const { state, launchApp, closeWindow, focusWindow } =
    useWindowManagerContext();
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  // Find the focused window (only one visible at a time on mobile)
  const focusedWindow = useMemo(
    () => state.windows.find((w) => w.id === state.focusedWindowId),
    [state.windows, state.focusedWindowId],
  );

  const currentApp = focusedWindow ? getApp(focusedWindow.appId) : null;

  const handleAppClick = useCallback(
    (appId: string) => {
      // Check if app is already running
      const existing = state.windows.find((w) => w.appId === appId);
      if (existing) {
        // Focus it if minimized
        focusWindow(existing.id);
      } else {
        // Launch it
        launchApp(appId);
      }
    },
    [state.windows, launchApp, focusWindow],
  );

  const handleBackToHome = useCallback(() => {
    // Close the focused window (or minimize it)
    if (focusedWindow) {
      closeWindow(focusedWindow.id);
    }
  }, [focusedWindow, closeWindow]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Status bar */}
      <MobileStatusBar
        currentAppName={currentApp?.name || null}
        onSpotlightOpen={() => setSpotlightOpen(true)}
      />

      {/* Main content area */}
      {focusedWindow ? (
        <>
          {/* Back button when app is open */}
          <div className="px-4 py-2 border-b border-border">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
          {/* Full-screen app */}
          <MobileAppRenderer appId={focusedWindow.appId} />
        </>
      ) : (
        /* App grid when no app is open */
        <MobileAppGrid onAppClick={handleAppClick} />
      )}

      {/* Bottom tab bar */}
      <MobileTabBar
        onAppClick={handleAppClick}
        activeAppId={focusedWindow?.appId || null}
      />

      {/* Spotlight */}
      <Spotlight
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
      />
    </div>
  );
}
