import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Lightbulb,
  TrendingUp,
  Zap,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const exportToCSV = () => {
    if (!data) return;
    const headers = ["Time", "Demand_MW", "Type"];
    const rows = data.series.map(
      (p) => `${p.time},${p.demand},${p.forecast ? "Forecast" : "Historical"}`
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GridForecast_${data.area.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Compute Y-axis domain with padding so the curve is visible
  const allDemands = data.series.map((p) => p.demand);
  const minD = Math.min(...allDemands);
  const maxD = Math.max(...allDemands);
  const padding = (maxD - minD) * 0.3 || maxD * 0.2 || 0.01;
  const yMin = Math.max(0, parseFloat((minD - padding).toFixed(4)));
  const yMax = parseFloat((maxD + padding).toFixed(4));

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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Primary card */}
        <Card className="bg-surface shadow-elevated border-border/60 relative overflow-hidden">
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
               <CardDescription className="text-xs uppercase tracking-wider font-medium text-primary">
                AI Optimization
              </CardDescription>
              <div className={cn("rounded-md p-1.5", severity.iconBg, data.actionSeverity === "critical" && "animate-pulse")}>
                <SevIcon className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className={cn("text-sm font-semibold leading-snug", data.actionSeverity === "critical" && "text-destructive")}>
               {data.actionSeverity === "critical" 
                 ? `SHIFT REQUIRED: Transfer 12% load from ${data.area} to buffer nodes.` 
                 : data.recommendedAction}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px]">
              <Lightbulb className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Action Priority:</span>
              <span
                className={cn(
                  "font-mono font-semibold uppercase tracking-wider",
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

        {/* ML Explainability */}
        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                ML Explainability
              </CardDescription>
              <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                 <div className="flex gap-0.5">
                   <div className="w-1 h-3 bg-primary rounded-sm opacity-50" />
                   <div className="w-1 h-3 bg-info rounded-sm opacity-80" />
                   <div className="w-1 h-3 bg-warning rounded-sm" />
                 </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Time Series Data</span><span>65%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[65%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Weather Impact</span><span>25%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-info w-[25%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Event Anomalies</span><span>10%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning w-[10%]" />
                </div>
              </div>
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
                  Demand Curve — {data.area}, {data.stateRegion}
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical load (solid) & forecast trajectory (dotted)
                </CardDescription>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs">
              <LegendDot color="hsl(var(--info))" label="Historical" />
              <LegendDot color="hsl(var(--primary))" label="Forecast" dotted />
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] px-2 py-0 border-primary/20 hover:bg-primary/10 ml-2"
                onClick={exportToCSV}
              >
                <Download className="h-3 w-3 mr-1" /> Export CSV
              </Button>
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
                  tickFormatter={(v) =>
                    v >= 1000
                      ? `${(v / 1000).toFixed(1)}k`
                      : v >= 1
                      ? `${v.toFixed(1)}`
                      : `${v.toFixed(3)}`
                  }
                  domain={[yMin, yMax]}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value: number | null, name: string) =>
                    value === null
                      ? null
                      : [
                          `${value >= 1 ? value.toLocaleString() : value.toFixed(4)} MW`,
                          name.charAt(0).toUpperCase() + name.slice(1),
                        ]
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
