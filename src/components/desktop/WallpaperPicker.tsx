import { useState } from 'react';
import { useWorkspaceContext } from './WindowManager';
import { useWindowManagerContext } from './WindowManager';

const PRESET_WALLPAPERS = [
  { name: 'Deep Space', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #2d1b69 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 30%, #1b4965 60%, #5fa8d3 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #0f9b8e 100%)' },
  { name: 'Ember', value: 'linear-gradient(135deg, #1a0a0a 0%, #2d1f1f 30%, #6b2d3e 60%, #d4556b 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #0a1a0a 0%, #1a2e1a 30%, #2d4a2d 60%, #4a7c59 100%)' },
  { name: 'Slate', value: 'linear-gradient(135deg, #1e1e2e 0%, #2b2b3d 30%, #3d3d56 60%, #525270 100%)' },
  { name: 'Dusk', value: 'linear-gradient(135deg, #141e30 0%, #243b55 40%, #4a3f6b 70%, #8b5e83 100%)' },
  { name: 'Void', value: 'linear-gradient(135deg, #000000 0%, #0a0a0a 30%, #111111 60%, #1a1a1a 100%)' },
  { name: 'Nebula', value: 'linear-gradient(135deg, #1f1c2c 0%, #353074 30%, #6c4ab6 60%, #8e44ad 100%)' },
];

export default function WallpaperPicker() {
  const workspace = useWorkspaceContext();
  const { state } = useWindowManagerContext();
  const [selected, setSelected] = useState(workspace.wallpaper);
  const [customUrl, setCustomUrl] = useState('');

  const handleApply = () => {
    workspace.updateWallpaper(selected);
    // Close the wallpaper picker window
    const pickerWindow = state.windows.find(w => w.appId === 'wallpaper-picker');
    if (pickerWindow) {
      // We can't close from here directly — user can close via title bar
      // The wallpaper is already applied
    }
  };

  const handlePresetClick = (value: string) => {
    setSelected(value);
    setCustomUrl('');
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
    if (url.trim()) {
      setSelected(`url(${url.trim()}) center/cover no-repeat`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card text-foreground overflow-hidden">
      {/* Preview */}
      <div
        className="mx-3 mt-3 h-28 rounded-lg border border-border/50 flex-shrink-0"
        style={{ background: selected }}
      />

      {/* Preset Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Presets</p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {PRESET_WALLPAPERS.map(preset => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset.value)}
              className={`
                aspect-square rounded-lg border-2 transition-all
                ${selected === preset.value ? 'border-primary ring-1 ring-primary/50 scale-105' : 'border-border/50 hover:border-border'}
              `}
              style={{ background: preset.value }}
              title={preset.name}
            />
          ))}
        </div>

        {/* Custom URL */}
        <p className="text-xs text-muted-foreground mb-2 font-medium">Custom Image URL</p>
        <input
          type="text"
          value={customUrl}
          onChange={e => handleCustomUrlChange(e.target.value)}
          placeholder="https://example.com/wallpaper.jpg"
          className="w-full px-3 py-1.5 text-xs bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border">
        <button
          onClick={() => setSelected(workspace.wallpaper)}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
