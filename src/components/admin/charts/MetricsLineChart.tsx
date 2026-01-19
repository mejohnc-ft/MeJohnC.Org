import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface DataPoint {
  timestamp: string;
  value: number;
  [key: string]: string | number;
}

interface MetricsLineChartProps {
  data: DataPoint[];
  title?: string;
  dataKey?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
  formatValue?: (value: number) => string;
  formatDate?: (timestamp: string) => string;
}

export default function MetricsLineChart({
  data,
  title,
  dataKey = 'value',
  color = 'hsl(var(--primary))',
  showGrid = true,
  showLegend = false,
  height = 300,
  formatValue = (v) => v.toLocaleString(),
  formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
}: MetricsLineChartProps) {
  const formattedData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        displayDate: formatDate(d.timestamp),
      })),
    [data, formatDate]
  );

  if (data.length === 0) {
    return (
      <Card className="p-6">
        {title && <h3 className="font-semibold text-foreground mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {title && <h3 className="font-semibold text-foreground mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
          <XAxis
            dataKey="displayDate"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ className: 'stroke-border' }}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ className: 'stroke-border' }}
            tickFormatter={formatValue}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [formatValue(value), dataKey]}
          />
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
