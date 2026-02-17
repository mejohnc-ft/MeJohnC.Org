import { useCallback } from 'react';
import { useWindowManagerContext } from './WindowManager';
import Window from './Window';

const WALLPAPER_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)';

export default function Desktop() {
  const { state } = useWindowManagerContext();

  const handleDesktopClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the desktop itself, not a window
    if (e.target === e.currentTarget) {
      // Future: deselect desktop icons
    }
  }, []);

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: WALLPAPER_GRADIENT }}
      onClick={handleDesktopClick}
    >
      {/* Windows */}
      {state.windows.map(win => (
        <Window key={win.id} window={win} />
      ))}
    </div>
  );
}
