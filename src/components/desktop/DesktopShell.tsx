import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import {
  WindowManagerProvider,
  useWindowManagerContext,
} from "./WindowManager";
import { useDesktopShortcuts } from "@/hooks/useDesktopShortcuts";
import MenuBar from "./MenuBar";
import Desktop from "./Desktop";
import Dock from "./Dock";
import Spotlight from "./Spotlight";
import NotificationCenter from "./NotificationCenter";

function DesktopShellContent() {
  const { state, toastMessage, closeWindow, minimizeWindow, focusWindow } =
    useWindowManagerContext();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  const openSpotlight = useCallback(() => setSpotlightOpen(true), []);
  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);
  const toggleNotifications = useCallback(
    () => setNotificationCenterOpen((prev) => !prev),
    [],
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
  });

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <MenuBar onToggleNotifications={toggleNotifications} />
      <Desktop />
      <Dock />
      <Spotlight isOpen={spotlightOpen} onClose={closeSpotlight} />
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 z-50"
          role="alert"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function DesktopShell() {
  const { isSignedIn, isLoaded, user } = useAuth();

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

  return (
    <WindowManagerProvider userId={user.id}>
      <DesktopShellContent />
    </WindowManagerProvider>
  );
}
