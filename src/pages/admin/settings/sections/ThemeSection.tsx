import { useState } from "react";
import { Save, Loader2, Palette, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import type { TenantBranding } from "@/lib/tenant-settings";

const ThemeSection = () => {
  const { settings, saveBranding, isSaving } = useTenantSettings();
  const [branding, setBranding] = useState<TenantBranding>(settings.branding);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSave = async () => {
    await saveBranding(branding);
    setSaveMessage("Saved!");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        Theme
      </h3>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={branding.primary_color}
              onChange={(e) =>
                setBranding({ ...branding, primary_color: e.target.value })
              }
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <input
              type="text"
              value={branding.primary_color}
              onChange={(e) =>
                setBranding({ ...branding, primary_color: e.target.value })
              }
              className="w-28 px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
              placeholder="#6366f1"
            />
            <div
              className="w-20 h-10 rounded border border-border"
              style={{ backgroundColor: branding.primary_color }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={branding.accent_color}
              onChange={(e) =>
                setBranding({ ...branding, accent_color: e.target.value })
              }
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <input
              type="text"
              value={branding.accent_color}
              onChange={(e) =>
                setBranding({ ...branding, accent_color: e.target.value })
              }
              className="w-28 px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
              placeholder="#8b5cf6"
            />
            <div
              className="w-20 h-10 rounded border border-border"
              style={{ backgroundColor: branding.accent_color }}
            />
          </div>
        </div>
      </div>

      {/* Dark/Light Mode Default */}
      <div>
        <label className="block text-sm font-medium mb-2">Default Mode</label>
        <div className="flex gap-3">
          <button
            onClick={() =>
              setBranding({ ...branding, dark_mode_default: true })
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              branding.dark_mode_default
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
          <button
            onClick={() =>
              setBranding({ ...branding, dark_mode_default: false })
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              !branding.dark_mode_default
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium mb-2">Preview</label>
        <div
          className="rounded-lg border border-border p-4"
          style={{
            backgroundColor: branding.dark_mode_default ? "#0a0a0a" : "#ffffff",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: branding.primary_color }}
            />
            <span
              className="font-semibold"
              style={{
                color: branding.dark_mode_default ? "#fafafa" : "#0a0a0a",
              }}
            >
              {branding.name || "Your Company"}
            </span>
          </div>
          <div className="flex gap-2">
            <div
              className="h-2 w-24 rounded"
              style={{ backgroundColor: branding.primary_color, opacity: 0.7 }}
            />
            <div
              className="h-2 w-16 rounded"
              style={{ backgroundColor: branding.accent_color, opacity: 0.7 }}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Theme
        </Button>
        {saveMessage && (
          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default ThemeSection;
