import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface DataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface MetricsBarChartProps {
  data: DataPoint[];
  title?: string;
  dataKey?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
  formatValue?: (value: number) => string;
  horizontal?: boolean;
}

export default function MetricsBarChart({
  data,
  title,
  dataKey = 'value',
  color = 'hsl(var(--primary))',
  showGrid = true,
  showLegend = false,
  height = 300,
  formatValue = (v) => v.toLocaleString(),
  horizontal = false,
}: MetricsBarChartProps) {
  const chartData = useMemo(() => data, [data]);

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
        <BarChart
          data={chartData}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-border' }}
                tickFormatter={formatValue}
              />
              <YAxis
                type="category"
                dataKey="label"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-border' }}
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
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
            </>
          )}
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
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
