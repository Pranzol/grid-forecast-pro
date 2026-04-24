import * as React from "react";
import { Check, ChevronDown, MapPin, Layers, Navigation, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_STATES,
  TELANGANA_CIRCLES,
  STATES_WITH_AREAS,
  formatCircleName,
  formatAreaName,
  STATE_TO_REGION,
} from "@/lib/locationData";
import { fetchStateAreas, fetchCircleDetail } from "@/lib/fetchLocationData";

export interface LocationValue {
  region: string;    // National grid region (NEW)
  state: string;
  circle: string;    // district/circle (only for Telangana)
  division: string;  // sub-district division
  area: string;      // specific area
}

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (loc: LocationValue) => void;
}

// ── Minimal styled select ────────────────────────────────────────────────────
interface SelectProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  count?: number;
}

function StyledSelect({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  options,
  icon,
  count,
}: SelectProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none z-10">
          {icon}
        </span>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-md border border-border bg-input/50 text-sm",
          "px-3 py-2.5 pr-8 transition-all duration-200",
          "hover:bg-input focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          icon ? "pl-9" : "pl-3",
          !value && "text-muted-foreground"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      {count !== undefined && count > 0 && (
        <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground/50 pointer-events-none">
          {count.toLocaleString()}
        </span>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const [circles, setCircles] = React.useState<string[]>([]);
  const [divisions, setDivisions] = React.useState<string[]>([]);
  const [areas, setAreas] = React.useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = React.useState(false);

  // Full hierarchy: circle → division → { subdivision → { section → areas[] } }
  const [circleAreaMap, setCircleAreaMap] = React.useState<Record<string, string[]>>({});
  const [circleHierarchy, setCircleHierarchy] = React.useState<
    Record<string, Record<string, Record<string, string[]>>>
  >({});

  // ── Options ──────────────────────────────────────────────────────────────
  const REGIONS = ["National", "Northern", "Western", "Eastern", "Southern", "NorthEastern"];
  const regionOptions = REGIONS.map((r) => ({ value: r, label: r + " Region" }));

  // Filter states by selected region
  const availableStates = value.region && value.region !== "National"
    ? ALL_STATES.filter(s => STATE_TO_REGION[s] === value.region)
    : ALL_STATES;

  const stateOptions = availableStates.map((s) => ({ value: s, label: s }));

  // ── When region changes ───────────────────────────────────────────────────
  const handleRegionChange = React.useCallback(
    (region: string) => {
      onChange({ region, state: "", circle: "", division: "", area: "" });
      setCircles([]);
      setDivisions([]);
      setAreas([]);
      setCircleAreaMap({});
      setCircleHierarchy({});
    },
    [onChange]
  );

  // ── When state changes ────────────────────────────────────────────────────
  const handleStateChange = React.useCallback(
    async (state: string) => {
      onChange({ ...value, state, circle: "", division: "", area: "" });
      setCircles([]);
      setDivisions([]);
      setAreas([]);
      setCircleAreaMap({});
      setCircleHierarchy({});

      if (!state) return;

      if (STATES_WITH_AREAS.has(state)) {
        setLoadingAreas(true);
        try {
          const data = await fetchStateAreas(state);
          const circleList = Object.keys(data.circles).sort();
          setCircles(circleList);
          setCircleAreaMap(data.circles);
        } catch {
          if (state === "Telangana") {
            setCircles([...TELANGANA_CIRCLES].sort());
          }
        } finally {
          setLoadingAreas(false);
        }
      }
    },
    [onChange]
  );

  // ── When circle changes — load division hierarchy ─────────────────────────
  const handleCircleChange = React.useCallback(
    async (circle: string) => {
      onChange({ ...value, circle, division: "", area: "" });
      setDivisions([]);
      setAreas([]);
      setCircleHierarchy({});

      if (!circle) return;

      setLoadingAreas(true);
      try {
        const data = await fetchCircleDetail(circle);
        setDivisions(data.divisions);
        setCircleHierarchy(data.detail);
      } catch {
        // Fallback: flat area list from the pre-loaded map
        const flatAreas = (circleAreaMap[circle] ?? []).sort();
        setAreas(flatAreas);
      } finally {
        setLoadingAreas(false);
      }
    },
    [value, onChange, circleAreaMap]
  );

  // ── When division changes — extract all areas from that division's hierarchy
  const handleDivisionChange = React.useCallback(
    (division: string) => {
      onChange({ ...value, division, area: "" });
      setAreas([]);

      if (!division || !circleHierarchy[division]) return;

      // Flatten subdivision → section → area[] into a single sorted list
      const allAreas: string[] = [];
      const divData = circleHierarchy[division];
      for (const subdiv of Object.values(divData)) {
        for (const sectionAreas of Object.values(subdiv)) {
          allAreas.push(...sectionAreas);
        }
      }
      setAreas(allAreas.sort());
    },
    [value, onChange, circleHierarchy]
  );

  // ── When area changes ─────────────────────────────────────────────────────
  const handleAreaChange = React.useCallback(
    (area: string) => {
      onChange({ ...value, area });
    },
    [value, onChange]
  );

  const circleOptions  = circles.map((c) => ({ value: c, label: formatCircleName(c) }));
  const divisionOptions= divisions.map((d) => ({ value: d, label: formatCircleName(d) }));
  const areaOptions    = areas.map((a) => ({ value: a, label: formatAreaName(a) }));

  const hasCircles   = circles.length > 0;
  const hasDivisions = divisions.length > 0;
  const hasAreas     = areas.length > 0;
  const stateHasGranularData = value.state ? STATES_WITH_AREAS.has(value.state) : false;

  return (
    <div className="space-y-3">
      {/* ── Region ── NEW */}
      <div className="space-y-1.5">
        <label
          htmlFor="select-region"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Layers className="h-3 w-3" />
          Grid Region
        </label>
        <StyledSelect
          id="select-region"
          value={value.region}
          onChange={handleRegionChange}
          placeholder="Select a Region..."
          options={regionOptions}
          icon={<Layers className="h-3.5 w-3.5" />}
        />
      </div>

      {/* ── State ── */}
      {value.region && (
        <div className="space-y-1.5">
          <label
            htmlFor="select-state"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <MapPin className="h-3 w-3" />
            State / UT
            <span className="text-[10px] text-muted-foreground/50 ml-1">(Optional)</span>
          </label>
          <StyledSelect
            id="select-state"
            value={value.state}
            onChange={handleStateChange}
            placeholder="Select a state..."
            options={stateOptions}
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* ── Circle / District ── */}
      {value.state && stateHasGranularData && (
        <div className="space-y-1.5">
          <label
            htmlFor="select-circle"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Layers className="h-3 w-3" />
            Circle / District
            {loadingAreas && (
              <span className="ml-1 text-[10px] text-primary animate-pulse font-mono">
                Loading…
              </span>
            )}
            {hasCircles && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
                {circles.length} circles
              </span>
            )}
          </label>
          <StyledSelect
            id="select-circle"
            value={value.circle}
            onChange={handleCircleChange}
            disabled={!hasCircles || loadingAreas}
            placeholder={loadingAreas ? "Loading circles..." : "Select a circle..."}
            options={circleOptions}
            icon={<Layers className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* ── Division (sub-district) ── NEW */}
      {value.circle && hasDivisions && (
        <div className="space-y-1.5">
          <label
            htmlFor="select-division"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Building2 className="h-3 w-3" />
            Division
            <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
              {divisions.length} divisions
            </span>
          </label>
          <StyledSelect
            id="select-division"
            value={value.division}
            onChange={handleDivisionChange}
            disabled={!hasDivisions}
            placeholder="Select a division..."
            options={divisionOptions}
            icon={<Building2 className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* ── Area ── */}
      {(value.division || value.circle) && hasAreas && (
        <div className="space-y-1.5">
          <label
            htmlFor="select-area"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Navigation className="h-3 w-3" />
            Area
            <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
              {areas.length.toLocaleString()} areas
            </span>
          </label>
          <StyledSelect
            id="select-area"
            value={value.area}
            onChange={handleAreaChange}
            disabled={!hasAreas}
            placeholder="Select an area..."
            options={areaOptions}
            icon={<Navigation className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* ── Info badge for states without granular data ── */}
      {value.state && !stateHasGranularData && (
        <div className="flex items-start gap-2 rounded-md bg-primary/8 border border-primary/20 px-3 py-2">
          <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Forecasting{" "}
            <span className="text-foreground font-medium">{value.state}</span>{" "}
            using regional grid model. Area-level data available for{" "}
            <span className="text-primary font-medium">Telangana</span> only.
          </p>
        </div>
      )}
    </div>
  );
}
