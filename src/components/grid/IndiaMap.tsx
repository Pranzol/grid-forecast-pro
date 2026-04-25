import { useState } from "react";
import { Zap, AlertTriangle } from "lucide-react";

interface IndiaMapProps {
  activeRegion: string | null;
  regionData: Array<{ name: string; mw: number; status: string }>;
}

export function IndiaMap({ activeRegion, regionData }: IndiaMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Helper to get region info
  const getRegion = (name: string) => regionData.find(r => r.name === name);

  // Geometric Map Layout Data
  const regionsConfig = [
    {
      id: "Northern",
      name: "Northern",
      points: "150,50 350,50 400,200 250,280 100,200",
      centerX: 250,
      centerY: 160,
    },
    {
      id: "Western",
      name: "Western",
      points: "50,250 200,250 250,400 150,550 0,400",
      centerX: 130,
      centerY: 380,
    },
    {
      id: "Southern",
      name: "Southern",
      points: "250,450 400,450 350,700 250,850 150,700",
      centerX: 275,
      centerY: 620,
    },
    {
      id: "Eastern",
      name: "Eastern",
      points: "300,250 500,250 550,450 400,500 250,400",
      centerX: 400,
      centerY: 360,
    },
    {
      id: "NorthEastern",
      name: "NorthEastern",
      points: "550,150 700,150 750,300 650,400 500,250",
      centerX: 620,
      centerY: 250,
    }
  ];

  const getColor = (status?: string) => {
    switch (status) {
      case "critical": return "#ff1744";
      case "warning": return "#ffb300";
      case "normal": return "#00e676";
      default: return "#00b0ff"; // info
    }
  };

  return (
    <div className="relative w-full h-full min-h-[600px] flex items-center justify-center p-8">
      {/* Top Left Badge */}
      <div className="absolute top-6 left-6 z-10 p-4 rounded-xl bg-background/90 backdrop-blur-md border border-border/60 shadow-elevated">
        <h4 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Grid Sector Map
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {hoveredRegion ? `${hoveredRegion} Sector Selected` : "Select a region on the right to focus"}
        </p>
      </div>

      {/* SVG Map Container */}
      <div className="w-full h-full flex items-center justify-center max-w-[800px]">
        <svg 
          viewBox="0 0 800 900" 
          className="w-full h-full filter drop-shadow-2xl overflow-visible"
          style={{ maxHeight: "80vh" }}
        >
          <defs>
            <filter id="glow-critical" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-normal" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Connectors (Background lines) */}
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="2" strokeDasharray="5,5">
            <line x1="250" y1="160" x2="130" y2="380" /> {/* N to W */}
            <line x1="250" y1="160" x2="400" y2="360" /> {/* N to E */}
            <line x1="130" y1="380" x2="275" y2="620" /> {/* W to S */}
            <line x1="400" y1="360" x2="275" y2="620" /> {/* E to S */}
            <line x1="130" y1="380" x2="400" y2="360" /> {/* W to E */}
            <line x1="400" y1="360" x2="620" y2="250" /> {/* E to NE */}
          </g>

          {/* Render stylized regions */}
          {regionsConfig.map((region) => {
            const data = getRegion(region.name);
            const isHighlighted = activeRegion === region.name || hoveredRegion === region.name;
            const isFaded = (activeRegion && activeRegion !== region.name) && (hoveredRegion !== region.name);
            const color = getColor(data?.status);
            const isCritical = data?.status === "critical";

            return (
              <g 
                key={region.id}
                onMouseEnter={() => setHoveredRegion(region.name)}
                onMouseLeave={() => setHoveredRegion(null)}
                className="cursor-pointer transition-all duration-500 ease-out origin-center"
                style={{ 
                  transformOrigin: `${region.centerX}px ${region.centerY}px`,
                  transform: isHighlighted ? 'scale(1.03)' : 'scale(1)',
                  opacity: isFaded ? 0.2 : 1
                }}
              >
                {/* Background Shadow/Glow */}
                <polygon
                  points={region.points}
                  fill={color}
                  fillOpacity={isHighlighted ? 0.3 : 0.15}
                  stroke={color}
                  strokeWidth={isHighlighted ? 4 : 2}
                  strokeDasharray={isCritical ? "10,5" : "none"}
                  filter={isCritical || isHighlighted ? "url(#glow-critical)" : "url(#glow-normal)"}
                  className={isCritical ? "animate-[pulse_2s_infinite]" : ""}
                  style={{ transition: "all 0.5s ease" }}
                />

                {/* Animated Inner Core for Critical Regions */}
                {isCritical && (
                  <circle 
                    cx={region.centerX} 
                    cy={region.centerY} 
                    r="30" 
                    fill={color} 
                    fillOpacity="0.2"
                    className="animate-ping"
                  />
                )}

                {/* Data Node Circle */}
                <circle 
                  cx={region.centerX} 
                  cy={region.centerY} 
                  r="6" 
                  fill="#fff" 
                  filter="drop-shadow(0 0 5px rgba(255,255,255,0.8))"
                />

                {/* Text Label Background */}
                <rect 
                  x={region.centerX - 60} 
                  y={region.centerY - 30} 
                  width="120" 
                  height="24" 
                  rx="4" 
                  fill="rgba(0,0,0,0.7)" 
                  className="pointer-events-none"
                />
                
                {/* Region Name Text */}
                <text 
                  x={region.centerX} 
                  y={region.centerY - 13} 
                  textAnchor="middle" 
                  fill="#fff" 
                  fontSize="14"
                  fontWeight="bold"
                  className="pointer-events-none font-mono tracking-widest drop-shadow-md"
                >
                  {region.name}
                </text>

                {/* MW Data Text */}
                {data && (
                  <>
                    <rect 
                      x={region.centerX - 45} 
                      y={region.centerY + 10} 
                      width="90" 
                      height="20" 
                      rx="4" 
                      fill="rgba(0,0,0,0.8)" 
                      className="pointer-events-none"
                    />
                    <text 
                      x={region.centerX} 
                      y={region.centerY + 24} 
                      textAnchor="middle" 
                      fill={color} 
                      fontSize="12"
                      fontWeight="bold"
                      className="pointer-events-none font-mono"
                    >
                      {data.mw.toLocaleString()} MW
                    </text>
                  </>
                )}

                {/* Warning Icon if elevated or critical */}
                {(data?.status === "critical" || data?.status === "warning") && (
                  <g transform={`translate(${region.centerX + 50}, ${region.centerY - 28})`} className="pointer-events-none">
                    <path 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                      stroke={color} 
                      strokeWidth="2" 
                      fill="none" 
                      className={data.status === "critical" ? "animate-pulse" : ""}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
