import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Bell } from "lucide-react";
import { ThemeToggleMinimal } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useWindowManagerContext, useWorkspaceContext } from "./WindowManager";
import { getApp } from "./apps/AppRegistry";
import VirtualSpaces from "./VirtualSpaces";

interface MenuBarProps {
  onToggleNotifications?: () => void;
  pendingCount?: number;
}

export default function MenuBar({
  onToggleNotifications,
  pendingCount = 0,
}: MenuBarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state } = useWindowManagerContext();
  const workspace = useWorkspaceContext();
  const [clock, setClock] = useState(formatTime());
  const [menuOpen, setMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const appMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Find focused app name
  const focusedWindow = state.windows.find(
    (w) => w.id === state.focusedWindowId,
  );
  const focusedApp = focusedWindow ? getApp(focusedWindow.appId) : null;

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setClock(formatTime()), 1_000);
    return () => clearInterval(interval);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Close app menu on outside click
  useEffect(() => {
    if (!appMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const clickedRef = appMenuRefs.current.get(appMenuOpen);
      if (clickedRef && !clickedRef.contains(e.target as Node)) {
        setAppMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [appMenuOpen]);

  // Close app menu on Escape
  useEffect(() => {
    if (!appMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAppMenuOpen(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [appMenuOpen]);

  // Handle app menu item click
  const handleAppMenuClick = (eventName?: string) => {
    if (eventName) {
      const event = new CustomEvent(eventName);
      window.dispatchEvent(event);
    }
    setAppMenuOpen(null);
  };

  return (
    <div
      className="h-7 flex items-center justify-between px-3 bg-card/90 backdrop-blur-sm border-b border-border select-none"
      style={{ zIndex: 50 }}
      role="menubar"
    >
      {/* Left: Logo + focused app name + app menus */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            jc_
          </button>

          {menuOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl py-1 z-[60]"
              role="menu"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                role="menuitem"
              >
                About this workspace
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/admin");
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                role="menuitem"
              >
                Switch to Classic Mode
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  window.open("/", "_blank");
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                role="menuitem"
              >
                View Site
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-muted transition-colors"
                role="menuitem"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {focusedApp && (
          <>
            <span className="text-xs font-semibold text-foreground">
              {focusedApp.name}
            </span>
            {focusedApp.menuItems && focusedApp.menuItems.length > 0 && (
              <div className="flex items-center gap-2">
                {focusedApp.menuItems.map((menu) => (
                  <div
                    key={menu.label}
                    className="relative"
                    ref={(el) => {
                      if (el) {
                        appMenuRefs.current.set(menu.label, el);
                      } else {
                        appMenuRefs.current.delete(menu.label);
                      }
                    }}
                  >
                    <button
                      onClick={() =>
                        setAppMenuOpen(
                          appMenuOpen === menu.label ? null : menu.label,
                        )
                      }
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted/50"
                      role="menuitem"
                      aria-haspopup="menu"
                      aria-expanded={appMenuOpen === menu.label}
                    >
                      {menu.label}
                    </button>

                    {appMenuOpen === menu.label && (
                      <div
                        className="absolute top-full left-0 mt-1 min-w-[160px] bg-card border border-border rounded-lg shadow-xl py-1 z-[60]"
                        role="menu"
                      >
                        {menu.items.map((item) =>
                          item.separator ? (
                            <div
                              key={item.id}
                              className="border-t border-border my-1"
                            />
                          ) : (
                            <button
                              key={item.id}
                              onClick={() => handleAppMenuClick(item.onClick)}
                              disabled={item.disabled}
                              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent flex items-center justify-between gap-4"
                              role="menuitem"
                            >
                              <span>{item.label}</span>
                              {item.shortcut && (
                                <span className="text-[10px] text-muted-foreground">
                                  {item.shortcut}
                                </span>
                              )}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Bell, Clock, Theme, User */}
      <div className="flex items-center gap-3">
        {onToggleNotifications && (
          <button
            data-notification-toggle
            onClick={onToggleNotifications}
            className="relative text-muted-foreground hover:text-foreground transition-colors"
            aria-label={
              pendingCount > 0
                ? `${pendingCount} pending approvals`
                : "Toggle notifications"
            }
          >
            <Bell className="w-3.5 h-3.5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5 animate-in fade-in zoom-in">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        )}
        <VirtualSpaces
          userId={workspace.userId}
          onSwitch={() => workspace.reloadWorkspace()}
        />
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {clock}
        </span>
        <ThemeToggleMinimal />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-5 h-5",
            },
          }}
        />
      </div>
    </div>
  );
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
