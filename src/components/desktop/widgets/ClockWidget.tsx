import { useEffect, useState } from "react";
import WidgetContainer from "./WidgetContainer";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  const dateString = time.toLocaleDateString("en-US", dateOptions);

  return (
    <WidgetContainer
      id="clock"
      title="Clock"
      defaultPosition={{ x: 80, y: 80 }}
      size={{ width: 200, height: 120 }}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl font-light text-foreground tabular-nums tracking-tight">
          {hours}:{minutes}
          <span className="text-2xl text-muted-foreground/70">:{seconds}</span>
        </div>
        <div className="text-xs text-muted-foreground/70 mt-2">
          {dateString}
        </div>
      </div>
    </WidgetContainer>
  );
}
