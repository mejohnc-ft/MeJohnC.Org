import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { parseTenantSettings } from "@/lib/tenant-settings";
import { Loader2, Undo2 } from "lucide-react";
import OnboardingWizard from "./OnboardingWizard";
import {
  WindowManagerProvider,
  useWindowManagerContext,
} from "./WindowManager";
import { useDesktopShortcuts } from "@/hooks/useDesktopShortcuts";
import { useIsMobile } from "@/hooks/useIsMobile";
import MenuBar from "./MenuBar";
import Desktop from "./Desktop";
import Dock from "./Dock";
import Spotlight from "./Spotlight";
import NotificationCenter from "./NotificationCenter";
import QuickNote from "./QuickNote";
import MissionControl from "./MissionControl";
import MobileShell from "./MobileShell";
import { useAgentConfirmations } from "@/hooks/useAgentConfirmations";
import { getTileGeometry, type TileLayout } from "./SnapLayoutMenu";

function DesktopShellContent() {
  const {
    state,
    toastMessage,
    closeWindow,
    minimizeWindow,
    focusWindow,
    resizeWindow,
    undo,
    undoToast,
    dismissUndoToast,
  } = useWindowManagerContext();
  const isMobile = useIsMobile();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [missionControlOpen, setMissionControlOpen] = useState(false);
  const { pending, pendingCount, respond } = useAgentConfirmations();

  const openSpotlight = useCallback(() => setSpotlightOpen(true), []);
  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);
  const toggleNotifications = useCallback(
    () => setNotificationCenterOpen((prev) => !prev),
    [],
  );
  const toggleQuickNote = useCallback(
    () => setQuickNoteOpen((prev) => !prev),
    [],
  );
  const toggleMissionControl = useCallback(
    () => setMissionControlOpen((prev) => !prev),
    [],
  );

  const tileWindow = useCallback(
    (id: string, layout: TileLayout) => {
      const geo = getTileGeometry(layout);
      resizeWindow(id, geo.width, geo.height, geo.x, geo.y);
    },
    [resizeWindow],
  );

  useDesktopShortcuts({
    closeWindow,
    minimizeWindow,
    focusWindow,
    focusedWindowId: state.focusedWindowId,
    windows: state.windows,
    openSpotlight,
    closeSpotlight,
    isSpotlightOpen: spotlightOpen,
    undo,
    toggleQuickNote,
    toggleMissionControl,
    tileWindow,
  });

  // Mobile layout
  if (isMobile) {
    return <MobileShell />;
  }

  // Desktop layout
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <MenuBar
        onToggleNotifications={toggleNotifications}
        pendingCount={pendingCount}
      />
      <Desktop />
      <Dock />
      <Spotlight isOpen={spotlightOpen} onClose={closeSpotlight} />
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        pendingConfirmations={pending}
        onRespond={respond}
      />
      <QuickNote
        isOpen={quickNoteOpen}
        onClose={() => setQuickNoteOpen(false)}
      />
      <MissionControl
        isOpen={missionControlOpen}
        onClose={() => setMissionControlOpen(false)}
      />
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 z-50"
          role="alert"
        >
          {toastMessage}
        </div>
      )}
      {undoToast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 z-50"
          role="alert"
        >
          <span>{undoToast.label}</span>
          <button
            onClick={() => {
              undo();
              dismissUndoToast();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function DesktopShell() {
  const { isSignedIn, isLoaded, user } = useAuth();
  const { tenant, status, isMainSite, refreshTenant } = useTenant();
  const [wizardDismissed, setWizardDismissed] = useState(false);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Show onboarding wizard for tenant users who haven't completed setup
  if (!isMainSite && status === "resolved" && !wizardDismissed) {
    const settings = parseTenantSettings(tenant?.settings);
    if (!settings.onboarding_complete) {
      return (
        <OnboardingWizard
          initialStep={settings.onboarding_step}
          onComplete={() => {
            setWizardDismissed(true);
            refreshTenant();
          }}
        />
      );
    }
  }

  return (
    <WindowManagerProvider userId={user.id}>
      <DesktopShellContent />
    </WindowManagerProvider>
  );
}
