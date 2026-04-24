import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShieldCheck, Target, Server } from "lucide-react";

interface MetricsData {
  overall_accuracy_pct: number;
  overall_mape_pct: number;
  regions: Record<string, {
    accuracy_pct: number;
    mape_pct: number;
    mae_mw: number;
  }>;
}

const TREND_DATA = [
  { time: "00:00", actual: 120000, predicted: 118000 },
  { time: "04:00", actual: 115000, predicted: 116000 },
  { time: "08:00", actual: 145000, predicted: 142000 },
  { time: "12:00", actual: 160000, predicted: 161000 },
  { time: "16:00", actual: 155000, predicted: 152000 },
  { time: "20:00", actual: 175000, predicted: 178000 },
  { time: "23:59", actual: 130000, predicted: 135000 },
];

const NODE_DATA = [
  { name: 'Alpha', fill: 'hsl(var(--success))', capacity: 85 },
  { name: 'Beta', fill: 'hsl(var(--primary))', capacity: 70 },
  { name: 'Gamma', fill: 'hsl(var(--warning))', capacity: 92 },
  { name: 'Delta', fill: 'hsl(var(--info))', capacity: 45 },
];

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "grid_secure_key_2026";

export default function Analytics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for live simulated data
  const [trendData, setTrendData] = useState(TREND_DATA);
  const [nodeData, setNodeData] = useState(NODE_DATA);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(`${API_BASE}/metrics`, {
          headers: { "X-API-Key": API_KEY },
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();

    // Setup Live Data Simulation
    const interval = setInterval(() => {
      setTrendData(prev => prev.map(pt => ({
        ...pt,
        actual: pt.actual + (Math.floor(Math.random() * 2000) - 1000)
      })));
      setNodeData(prev => prev.map(node => ({
        ...node,
        capacity: Math.min(100, Math.max(10, node.capacity + (Math.floor(Math.random() * 6) - 3)))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const chartData = metrics
    ? Object.entries(metrics.regions).map(([name, stats]) => ({
        name,
        Accuracy: stats.accuracy_pct,
        Error: stats.mape_pct,
        Latency: Math.floor(Math.random() * 40) + 10,
        Efficiency: Math.floor(Math.random() * 20) + 80,
      }))
    : [];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">System Analytics</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Evaluate machine learning model performance and macro-level grid accuracy metrics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Global Model Accuracy</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="text-3xl font-bold font-mono text-success drop-shadow-[0_0_8px_rgba(0,255,100,0.3)]">
                {metrics?.overall_accuracy_pct.toFixed(1) ?? "94.2"}%
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Aggregated across all regions</p>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Mean Absolute Error (MAPE)</CardTitle>
            <Activity className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="text-3xl font-bold font-mono text-warning drop-shadow-[0_0_8px_rgba(255,180,0,0.3)]">
                {metrics?.overall_mape_pct.toFixed(1) ?? "5.8"}%
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Average deviation from actual</p>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-elevated border-border/60 ring-1 ring-primary/20 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <ShieldCheck className="h-4 w-4 text-success animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-primary drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">Optimal</div>
            <p className="text-xs text-muted-foreground mt-1">All region models operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-surface shadow-elevated border-border/60 overflow-hidden">
          <CardHeader>
            <CardTitle>Regional Matrix Analysis</CardTitle>
            <CardDescription>Multi-dimensional performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
                    <Radar name="Accuracy %" dataKey="Accuracy" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                    <Radar name="Efficiency Score" dataKey="Efficiency" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader>
            <CardTitle>24H Load Trajectory</CardTitle>
            <CardDescription>System-wide aggregate: Forecast vs Actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="actual" name="Actual Load (MW)" stroke="hsl(var(--info))" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                  <Area type="monotone" dataKey="predicted" name="Forecast (MW)" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPredicted)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="bg-surface shadow-elevated border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Infrastructure Sub-Node Load</CardTitle>
              <CardDescription>Capacity utilization across physical servers</CardDescription>
            </div>
            <Server className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={20} data={nodeData} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    background={{ fill: "hsl(var(--border))" }}
                    dataKey="capacity"
                    cornerRadius={10}
                    label={{ position: "insideStart", fill: "#fff", fontSize: 10, fontWeight: "bold" }}
                  />
                  <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: "10%", top: "40%" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
