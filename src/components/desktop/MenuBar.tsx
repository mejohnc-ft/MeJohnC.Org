import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Bell } from "lucide-react";
import { ThemeToggleMinimal } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useWindowManagerContext } from "./WindowManager";
import { getApp } from "./apps/AppRegistry";

interface MenuBarProps {
  onToggleNotifications?: () => void;
}

export default function MenuBar({ onToggleNotifications }: MenuBarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state } = useWindowManagerContext();
  const [clock, setClock] = useState(formatTime());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      className="h-7 flex items-center justify-between px-3 bg-card/90 backdrop-blur-sm border-b border-border select-none"
      style={{ zIndex: 50 }}
      role="menubar"
    >
      {/* Left: Logo + focused app name */}
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
                About mejohnc.org
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
          <span className="text-xs font-semibold text-foreground">
            {focusedApp.name}
          </span>
        )}
      </div>

      {/* Right: Bell, Clock, Theme, User */}
      <div className="flex items-center gap-3">
        {onToggleNotifications && (
          <button
            data-notification-toggle
            onClick={onToggleNotifications}
            className="relative text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle notifications"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}
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
