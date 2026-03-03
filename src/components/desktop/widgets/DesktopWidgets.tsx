import { useState, useEffect } from "react";
import ClockWidget from "./ClockWidget";
import QuickNotesWidget from "./QuickNotesWidget";
import MetricsWidget from "./MetricsWidget";

interface WidgetConfig {
  id: string;
  component: React.ComponentType;
  defaultVisible: boolean;
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: "clock", component: ClockWidget, defaultVisible: true },
  { id: "quick-notes", component: QuickNotesWidget, defaultVisible: true },
  { id: "metrics", component: MetricsWidget, defaultVisible: true },
];

export default function DesktopWidgets() {
  const [visibleWidgets] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("desktop-widgets-visible");
    if (saved) {
      return new Set(JSON.parse(saved));
    }
    // Default to all widgets visible
    return new Set(
      AVAILABLE_WIDGETS.filter((w) => w.defaultVisible).map((w) => w.id),
    );
  });

  useEffect(() => {
    localStorage.setItem(
      "desktop-widgets-visible",
      JSON.stringify([...visibleWidgets]),
    );
  }, [visibleWidgets]);

  return (
    <>
      {AVAILABLE_WIDGETS.map((widget) => {
        if (!visibleWidgets.has(widget.id)) return null;
        const Component = widget.component;
        return <Component key={widget.id} />;
      })}
    </>
  );
}
