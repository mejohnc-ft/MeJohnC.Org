import { useEffect, useState } from "react";
import WidgetContainer from "./WidgetContainer";

export default function QuickNotesWidget() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("widget-quick-notes");
    return saved || "";
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("widget-quick-notes", notes);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [notes]);

  return (
    <WidgetContainer
      id="quick-notes"
      title="Quick Notes"
      defaultPosition={{ x: 300, y: 80 }}
      size={{ width: 220, height: 180 }}
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type your notes here..."
        className="w-full h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none border-none outline-none focus:ring-0"
      />
    </WidgetContainer>
  );
}
