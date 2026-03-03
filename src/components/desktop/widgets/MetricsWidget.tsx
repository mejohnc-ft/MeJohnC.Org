import WidgetContainer from "./WidgetContainer";
import { CheckSquare, Cpu, Clock } from "lucide-react";

export default function MetricsWidget() {
  // Placeholder data - can be connected to real data hooks later
  const metrics = [
    {
      label: "Open Tasks",
      value: 12,
      icon: CheckSquare,
      color: "text-blue-400",
    },
    {
      label: "Active Agents",
      value: 3,
      icon: Cpu,
      color: "text-purple-400",
    },
    {
      label: "Uptime",
      value: "24h",
      icon: Clock,
      color: "text-green-400",
    },
  ];

  return (
    <WidgetContainer
      id="metrics"
      title="Metrics"
      defaultPosition={{ x: 540, y: 80 }}
      size={{ width: 240, height: 140 }}
    >
      <div className="flex flex-col gap-2 h-full">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center gap-3 p-2 rounded-lg bg-background/20 hover:bg-background/30 transition-colors"
            >
              <Icon className={`w-4 h-4 ${metric.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground/70">
                  {metric.label}
                </div>
              </div>
              <div
                className={`text-lg font-semibold tabular-nums ${metric.color}`}
              >
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetContainer>
  );
}
