import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Lightbulb,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PredictionResponse } from "@/lib/fetchPredictionData";

interface ResultsPanelProps {
  data: PredictionResponse | null;
  loading: boolean;
}

export function ResultsPanel({ data, loading }: ResultsPanelProps) {
  if (loading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const severityStyles = {
    normal: {
      icon: CheckCircle2,
      ring: "ring-success/40",
      iconBg: "bg-success/15 text-success",
      label: "Stable",
    },
    warning: {
      icon: AlertTriangle,
      ring: "ring-warning/40",
      iconBg: "bg-warning/15 text-warning",
      label: "Elevated",
    },
    critical: {
      icon: AlertTriangle,
      ring: "ring-destructive/50",
      iconBg: "bg-destructive/15 text-destructive",
      label: "Critical",
    },
  } as const;

  const severity = severityStyles[data.actionSeverity];
  const SevIcon = severity.icon;

  // Split series for chart rendering: continuous lines for historical & forecast
  const chartData = data.series.map((p) => ({
    time: p.time,
    historical: p.forecast ? null : p.demand,
    forecast: p.forecast ? p.demand : null,
  }));
  // Bridge: include the last historical point in forecast line so it visually connects
  const lastHistIdx = data.series.findIndex((p) => p.forecast) - 1;
  if (lastHistIdx >= 0) {
    chartData[lastHistIdx].forecast = data.series[lastHistIdx].demand;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Primary card */}
        <Card className="md:col-span-3 lg:col-span-1 bg-surface shadow-elevated border-border/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Predicted Demand
              </CardDescription>
              <div className="rounded-md bg-primary/15 p-1.5 text-primary">
                <Zap className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-gradient-primary font-mono">
                {data.predictedDemandMW.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">MW</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
              <span className="text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">
                  {data.confidencePercent}%
                </span>{" "}
                model confidence
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Peak time */}
        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Expected Peak
              </CardDescription>
              <div className="rounded-md bg-info/15 p-1.5 text-info">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight font-mono">
                {data.peakTime}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-info" />
              <span className="font-mono font-semibold text-foreground">
                {data.peakDemandMW.toLocaleString()} MW
              </span>
              <span>peak load</span>
            </div>
          </CardContent>
        </Card>

        {/* Recommended action */}
        <Card
          className={cn(
            "bg-surface shadow-elevated border-border/60 ring-1",
            severity.ring,
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Recommended Action
              </CardDescription>
              <div className={cn("rounded-md p-1.5", severity.iconBg)}>
                <SevIcon className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold leading-snug">
              {data.recommendedAction}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <Lightbulb className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  data.actionSeverity === "normal" && "text-success",
                  data.actionSeverity === "warning" && "text-warning",
                  data.actionSeverity === "critical" && "text-destructive",
                )}
              >
                {severity.label}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-surface shadow-elevated border-border/60">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Demand Curve — {data.city}
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical load (solid) & forecast trajectory (dotted)
                </CardDescription>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs">
              <LegendDot color="hsl(var(--info))" label="Historical" />
              <LegendDot color="hsl(var(--primary))" label="Forecast" dotted />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(v) => `${v}`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value: number | null) =>
                    value === null ? ["—", ""] : [`${value.toLocaleString()} MW`, ""]
                  }
                />
                <ReferenceLine
                  y={data.peakDemandMW}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: "Peak",
                    fill: "hsl(var(--warning))",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="historical"
                  name="Historical"
                  stroke="hsl(var(--info))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--info))" }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="line"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dotted,
}: {
  color: string;
  label: string;
  dotted?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span
        className="inline-block h-0.5 w-5"
        style={{
          backgroundColor: dotted ? "transparent" : color,
          borderTop: dotted ? `2px dashed ${color}` : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="bg-surface shadow-elevated border-border/60 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-primary/10 p-5 mb-5 ring-1 ring-primary/20">
          <Gauge className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">
          Awaiting Forecast Parameters
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Configure your prediction parameters in the panel and click{" "}
          <span className="font-medium text-foreground">
            Generate Grid Forecast
          </span>{" "}
          to view demand projections, peak times, and recommended grid actions.
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="bg-surface shadow-elevated border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-surface shadow-elevated border-border/60">
        <CardHeader>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
