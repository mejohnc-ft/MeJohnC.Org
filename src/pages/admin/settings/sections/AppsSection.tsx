import { useState } from "react";
import {
  Save,
  Loader2,
  AppWindow,
  Lock,
  ArrowUpCircle,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useBilling } from "@/hooks/useBilling";
import {
  appRegistry,
  getAppsForPlan,
} from "@/components/desktop/apps/AppRegistry";
import { planMeetsMinimum } from "@/lib/billing";

const AppsSection = () => {
  const { settings, saveEnabledApps, saveDockPinned, isSaving } =
    useTenantSettings();
  const { plan } = useBilling();
  const availableApps = getAppsForPlan(plan);
  const availableIds = new Set(availableApps.map((a) => a.id));

  const [enabledApps, setEnabledApps] = useState<string[]>(
    settings.enabled_apps,
  );
  const [dockPinned, setDockPinned] = useState<string[]>(settings.dock_pinned);
  const [saveMessage, setSaveMessage] = useState("");

  // Filter out system apps that shouldn't be toggled
  const configurableApps = appRegistry.filter((a) => a.category !== "system");

  const toggleApp = (id: string) => {
    setEnabledApps((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
    // Remove from dock pinned if disabled
    if (enabledApps.includes(id)) {
      setDockPinned((prev) => prev.filter((a) => a !== id));
    }
  };

  const toggleDockPin = (id: string) => {
    setDockPinned((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    await saveEnabledApps(enabledApps);
    await saveDockPinned(dockPinned);
    setSaveMessage("Saved!");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AppWindow className="w-5 h-5 text-primary" />
          Enabled Apps
        </h3>
        <Badge variant="outline" className="text-xs">
          {enabledApps.length} enabled
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {configurableApps.map((app) => {
          const isAvailable = availableIds.has(app.id);
          const isEnabled = enabledApps.includes(app.id);
          const isPinned = dockPinned.includes(app.id);
          const needsUpgrade = !isAvailable && app.minPlan;

          return (
            <div
              key={app.id}
              className={`border rounded-lg p-3 transition-colors ${
                isEnabled
                  ? "border-primary/50 bg-primary/5"
                  : needsUpgrade
                    ? "border-border bg-muted/30 opacity-60"
                    : "border-border bg-background"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${app.color}`}>
                    {app.name}
                  </span>
                  {app.minPlan && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {app.minPlan}+
                    </Badge>
                  )}
                </div>
                {needsUpgrade ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleApp(app.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">
                  {app.category}
                </span>
                {isEnabled && !needsUpgrade && (
                  <button
                    onClick={() => toggleDockPin(app.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      isPinned
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    {isPinned ? "Pinned" : "Pin"}
                  </button>
                )}
                {needsUpgrade &&
                  app.minPlan &&
                  !planMeetsMinimum(plan, app.minPlan) && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <ArrowUpCircle className="w-3 h-3" />
                      Upgrade
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Apps
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

export default AppsSection;
