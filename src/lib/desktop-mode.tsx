/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STORAGE_KEYS } from './constants';

interface DesktopModeContextType {
  isDesktopMode: boolean;
  enterDesktopMode: () => void;
  exitDesktopMode: () => void;
  toggleDesktopMode: () => void;
}

const DesktopModeContext = createContext<DesktopModeContextType | undefined>(undefined);

export function DesktopModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Desktop mode is determined by route prefix
  const isDesktopMode = location.pathname.startsWith('/admin/desktop');

  const enterDesktopMode = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.DESKTOP_MODE, 'true');
    navigate('/admin/desktop');
  }, [navigate]);

  const exitDesktopMode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.DESKTOP_MODE);
    navigate('/admin');
  }, [navigate]);

  const toggleDesktopMode = useCallback(() => {
    if (isDesktopMode) {
      exitDesktopMode();
    } else {
      enterDesktopMode();
    }
  }, [isDesktopMode, enterDesktopMode, exitDesktopMode]);

  return (
    <DesktopModeContext.Provider value={{ isDesktopMode, enterDesktopMode, exitDesktopMode, toggleDesktopMode }}>
      {children}
    </DesktopModeContext.Provider>
  );
}

export function useDesktopMode() {
  const context = useContext(DesktopModeContext);
  if (context === undefined) {
    throw new Error('useDesktopMode must be used within a DesktopModeProvider');
  }
  return context;
}

/**
 * Lightweight check for use outside the provider (e.g. AdminLayout bypass).
 * Just checks the route — no context required.
 */
export function isDesktopRoute(pathname: string): boolean {
  return pathname.startsWith('/admin/desktop');
}
