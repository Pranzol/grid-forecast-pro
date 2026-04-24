import { useState, useEffect } from "react";
import { Activity, Map as MapIcon, Zap, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndiaMap } from "@/components/grid/IndiaMap";

const INITIAL_REGIONS = [
  { name: "Northern", load: "High", mw: 64200, status: "critical", color: "bg-destructive" },
  { name: "Western", load: "Elevated", mw: 58100, status: "warning", color: "bg-warning" },
  { name: "Southern", load: "Normal", mw: 45300, status: "normal", color: "bg-success" },
  { name: "Eastern", load: "Normal", mw: 23100, status: "normal", color: "bg-success" },
  { name: "NorthEastern", load: "Low", mw: 3200, status: "normal", color: "bg-info" },
];

export default function Heatmap() {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [regionData, setRegionData] = useState(INITIAL_REGIONS);

  useEffect(() => {
    const interval = setInterval(() => {
      setRegionData(prev => prev.map(region => {
        // Random fluctuation between -1000 and +1000 MW
        const fluctuation = Math.floor(Math.random() * 2000) - 1000;
        const newMw = Math.max(0, region.mw + fluctuation);
        
        let newStatus = "normal";
        let newLoad = "Normal";
        let newColor = "bg-success";
        
        if (newMw > 60000) {
          newStatus = "critical"; newLoad = "High"; newColor = "bg-destructive";
        } else if (newMw > 50000) {
          newStatus = "warning"; newLoad = "Elevated"; newColor = "bg-warning";
        } else if (newMw < 10000) {
          newStatus = "normal"; newLoad = "Low"; newColor = "bg-info";
        }

        return { ...region, mw: newMw, status: newStatus, load: newLoad, color: newColor };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            Regional Heatmap
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Real-time visualization of grid load intensity across major sectors. Click a region to highlight it on the map.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-success uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Interactive Map Area */}
        <Card className="bg-surface shadow-elevated border-border/60 min-h-[700px] flex items-center justify-center relative overflow-hidden order-2 lg:order-1">
          <div className="absolute inset-0 z-0">
            <IndiaMap activeRegion={activeRegion} regionData={regionData} />
          </div>
          {/* Overlay grid lines for aesthetic */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        </Card>

        {/* Region Cards */}
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2 order-1 lg:order-2 custom-scrollbar">
          {regionData.map((region) => (
            <Card 
              key={region.name} 
              onClick={() => setActiveRegion(activeRegion === region.name ? null : region.name)}
              className={`relative overflow-hidden group cursor-pointer transition-all duration-300 ${
                activeRegion === region.name 
                  ? "bg-surface/90 shadow-[0_0_20px_rgba(0,255,255,0.15)] border-primary scale-[1.02]" 
                  : "bg-surface/50 hover:bg-surface/80 shadow-elevated border-border/60"
              }`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${region.color} transition-all duration-300 ${activeRegion === region.name ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} />
              
              <CardHeader className="pb-2 pl-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {region.name}
                      <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${activeRegion === region.name ? "rotate-90 text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1"}`} />
                    </CardTitle>
                  </div>
                  <Badge variant={region.status === "critical" ? "destructive" : region.status === "warning" ? "default" : "secondary"} className="uppercase font-mono text-[10px]">
                    {region.load}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pl-6">
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground/90">{region.mw.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">MW</span>
                </div>
                
                <div className="mt-4 h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/40">
                  <div 
                    className={`h-full ${region.color} transition-all duration-1000 ease-out`} 
                    style={{ width: `${Math.min(100, (region.mw / 70000) * 100)}%` }} 
                  />
                </div>
              </CardContent>
              
              <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${region.status === "critical" ? "text-destructive" : "text-primary"}`}>
                {region.status === "critical" ? <Activity className="w-24 h-24" /> : <Zap className="w-24 h-24" />}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
