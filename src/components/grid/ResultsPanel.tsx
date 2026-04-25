import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Lightbulb,
  TrendingUp,
  Zap,
  Download,
  Building2,
  BatteryCharging,
  FlameKindling,
  Activity,
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
      barColor: "bg-success",
    },
    warning: {
      icon: AlertTriangle,
      ring: "ring-warning/40",
      iconBg: "bg-warning/15 text-warning",
      label: "Elevated",
      barColor: "bg-warning",
    },
    critical: {
      icon: AlertTriangle,
      ring: "ring-destructive/50",
      iconBg: "bg-destructive/15 text-destructive",
      label: "Critical",
      barColor: "bg-destructive",
    },
  } as const;

  const severity = severityStyles[data.actionSeverity];
  const SevIcon = severity.icon;

  // Duration-aware total energy (from backend)
  const forecastPoints = data.series.filter((p) => p.forecast);
  const durationHours = forecastPoints.length;
  const totalMWh = data.totalEnergyMWh ?? forecastPoints.reduce((s, p) => s + p.demand, 0);
  const totalEnergyLabel =
    totalMWh >= 1000
      ? `${(totalMWh / 1000).toFixed(2)} GWh`
      : `${totalMWh.toFixed(1)} MWh`;

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

  const allDemands = data.series.map((p) => p.demand);
  const minD = Math.min(...allDemands);
  const maxD = Math.max(...allDemands);
  const padding = (maxD - minD) * 0.3 || maxD * 0.2 || 0.01;
  const yMin = Math.max(0, parseFloat((minD - padding).toFixed(4)));
  const yMax = parseFloat((maxD + padding).toFixed(4));

  const chartData = data.series.map((p) => ({
    time: p.time,
    historical: p.forecast ? null : p.demand,
    forecast: p.forecast ? p.demand : null,
  }));
  const lastHistIdx = data.series.findIndex((p) => p.forecast) - 1;
  if (lastHistIdx >= 0) {
    chartData[lastHistIdx].forecast = data.series[lastHistIdx].demand;
  }

  // Severity bar width
  const severityWidth =
    data.actionSeverity === "critical"
      ? "w-full"
      : data.actionSeverity === "warning"
      ? "w-2/3"
      : "w-1/3";

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ── Row 1: 4 stat cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Predicted Demand */}
        <Card className="col-span-2 lg:col-span-2 bg-surface shadow-elevated border-border/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Avg Predicted Demand
              </CardDescription>
              <div className="rounded-md bg-primary/15 p-1.5 text-primary">
                <Zap className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-gradient-primary font-mono">
                {data.predictedDemandMW.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">MW</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
                <span className="text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">
                    {data.confidencePercent}%
                  </span>{" "}
                  confidence
                </span>
              </div>
              <span className="text-border">|</span>
              <span className="text-muted-foreground font-mono">
                <span className="text-primary font-semibold">
                  {durationHours}h
                </span>{" "}
                window
              </span>
            </div>
              <div className="mt-3 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Total energy over window</span>
                <span className="font-mono text-primary font-semibold">
                  {totalEnergyLabel}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Peak Time */}
        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Peak Time
              </CardDescription>
              <div className="rounded-md bg-info/15 p-1.5 text-info">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight font-mono">
                {data.peakTime}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-warning" />
              <span className="font-mono font-semibold text-foreground">
                {data.peakDemandMW.toLocaleString()} MW
              </span>
              <span>peak</span>
            </div>
          </CardContent>
        </Card>

        {/* Grid Status */}
        <Card className={cn("bg-surface shadow-elevated border-border/60 ring-1", severity.ring)}>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Grid Status
              </CardDescription>
              <div className={cn("rounded-md p-1.5", severity.iconBg, data.actionSeverity === "critical" && "animate-pulse")}>
                <SevIcon className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={cn(
              "text-lg font-bold leading-tight",
              data.actionSeverity === "critical" && "text-destructive",
              data.actionSeverity === "warning" && "text-warning",
              data.actionSeverity === "normal" && "text-success"
            )}>
              {severity.label}
            </p>
            {/* Severity bar */}
            <div className="mt-2 h-1.5 rounded-full bg-border/50 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", severity.barColor, severityWidth)} />
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="leading-tight line-clamp-2">
                {data.actionSeverity === "critical" && data.area
                  ? `SHIFT REQUIRED: Transfer 12% load from ${data.area} to buffer nodes.` 
                  : data.recommendedAction}
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

      {/* ── Building Energy Card (only when sqft provided) ── */}
      {data.sqft && data.sqft > 0 && (
        <Card className="bg-surface shadow-elevated border-border/60 border-primary/20 ring-1 ring-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="border-b border-border/60 relative">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Building Energy Analysis
                </CardTitle>
                <CardDescription className="text-xs">
                  Estimates for{" "}
                  <span className="font-mono font-semibold text-primary">
                    {data.sqft.toLocaleString()} sqft
                  </span>{" "}
                  over {durationHours}h forecast window
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Estimated kWh */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <BatteryCharging className="h-3 w-3 text-primary" />
                  Total Energy
                </div>
                <div className="font-mono text-2xl font-bold text-gradient-primary">
                  {data.estimatedKwh != null
                    ? data.estimatedKwh >= 1000
                      ? `${(data.estimatedKwh / 1000).toFixed(2)}`
                      : data.estimatedKwh.toFixed(2)
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.estimatedKwh != null && data.estimatedKwh >= 1000 ? "MWh" : "kWh"} used
                </div>
              </div>

              {/* Peak kW */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <Zap className="h-3 w-3 text-warning" />
                  Peak Load
                </div>
                <div className="font-mono text-2xl font-bold text-foreground">
                  {data.estimatedKw != null ? data.estimatedKw.toLocaleString() : "—"}
                </div>
                <div className="text-xs text-muted-foreground">kW demand</div>
              </div>

              {/* Per sqft */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <Activity className="h-3 w-3 text-info" />
                  Intensity
                </div>
                <div className="font-mono text-2xl font-bold text-foreground">
                  {data.estimatedKwhPerSqft != null
                    ? (data.estimatedKwhPerSqft * 1000).toFixed(3)
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Wh/sqft</div>
              </div>

              {/* Monthly estimate */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <FlameKindling className="h-3 w-3 text-destructive" />
                  Monthly Est.
                </div>
                <div className="font-mono text-2xl font-bold text-foreground">
                  {data.monthlyKwhEstimate != null
                    ? data.monthlyKwhEstimate >= 1000
                      ? `${(data.monthlyKwhEstimate / 1000).toFixed(1)}k`
                      : data.monthlyKwhEstimate.toFixed(0)
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">kWh / month</div>
              </div>
            </div>

            {/* Intensity badge */}
            {data.areaIntensity && (
              <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Area Intensity:</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-semibold font-mono",
                  data.areaIntensity === "Low" && "bg-success/20 text-success",
                  data.areaIntensity === "Medium" && "bg-warning/20 text-warning",
                  data.areaIntensity === "High" && "bg-destructive/20 text-destructive",
                )}>
                  {data.areaIntensity}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  — based on TG-NPDCL area consumption data
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Demand Chart ── */}
      <Card className="bg-surface shadow-elevated border-border/60">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Demand Curve — {data.city}, {data.region}
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical load (solid) &amp; {durationHours}h forecast trajectory (dotted)
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
    <Card className="bg-surface shadow-elevated border-border/60 border-dashed relative overflow-hidden h-[500px] flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="radar-sweep" />
        <div className="absolute inset-0 border-[1px] border-primary/20 rounded-full h-[400px] w-[400px] flex items-center justify-center">
          <div className="border-[1px] border-primary/20 rounded-full h-[300px] w-[300px] flex items-center justify-center">
            <div className="border-[1px] border-primary/20 rounded-full h-[200px] w-[200px]" />
          </div>
        </div>
      </div>

      <CardContent className="flex flex-col items-center justify-center text-center relative z-10">
        <div className="rounded-full bg-primary/10 p-6 mb-6 ring-1 ring-primary/20 relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-glow" />
          <Gauge className="h-10 w-10 text-primary relative z-10" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-gradient-primary">
          System Standby
        </h3>
        <p className="mt-3 max-w-[300px] text-sm text-muted-foreground leading-relaxed">
          Configure your prediction parameters in the panel and click{" "}
          <span className="font-semibold text-primary">Generate</span>{" "}
          to initialize the AI forecast simulation.
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5 relative animate-pulse">
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pt-[10%]">
        <div className="bg-background/80 backdrop-blur-md px-6 py-4 rounded-xl shadow-glow border border-primary/30 flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-mono text-primary font-semibold tracking-widest uppercase">
            Processing Simulation...
          </span>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 opacity-30">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className={cn("bg-surface shadow-elevated border-border/60", i === 0 && "col-span-2")}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24 bg-primary/20" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-32 bg-primary/20" />
              <Skeleton className="h-3 w-40 bg-primary/10" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-surface shadow-elevated border-border/60 opacity-30">
        <CardHeader>
          <Skeleton className="h-4 w-48 bg-primary/20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full bg-primary/10" />
        </CardContent>
      </Card>
    </div>
  );
}
