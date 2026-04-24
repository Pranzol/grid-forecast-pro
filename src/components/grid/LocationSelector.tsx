import * as React from "react";
import { Check, ChevronDown, MapPin, Layers, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_STATES,
  TELANGANA_CIRCLES,
  STATES_WITH_AREAS,
  formatCircleName,
  formatAreaName,
} from "@/lib/locationData";
import { fetchStateAreas } from "@/lib/fetchLocationData";

export interface LocationValue {
  state: string;
  circle: string;   // district/circle (only for Telangana)
  area: string;     // specific area
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
}

function StyledSelect({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  options,
  icon,
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
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const [circles, setCircles] = React.useState<string[]>([]);
  const [areas, setAreas] = React.useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = React.useState(false);
  const [circleAreaMap, setCircleAreaMap] = React.useState<
    Record<string, string[]>
  >({});

  // ── State options (alphabetical) ──────────────────────────────────────────
  const stateOptions = ALL_STATES.map((s) => ({ value: s, label: s }));

  // ── When state changes, load circles ─────────────────────────────────────
  const handleStateChange = React.useCallback(
    async (state: string) => {
      // Reset downstream selections
      onChange({ state, circle: "", area: "" });
      setCircles([]);
      setAreas([]);
      setCircleAreaMap({});

      if (!state) return;

      if (STATES_WITH_AREAS.has(state)) {
        // State has granular data → fetch from backend
        setLoadingAreas(true);
        try {
          const data = await fetchStateAreas(state);
          const circleList = Object.keys(data.circles).sort();
          setCircles(circleList);
          setCircleAreaMap(data.circles);
        } catch {
          // Fall back to static Telangana circles
          if (state === "Telangana") {
            const staticCircles = [...TELANGANA_CIRCLES].sort();
            setCircles(staticCircles);
          }
        } finally {
          setLoadingAreas(false);
        }
      }
      // For states without granular data, circles/areas stay empty
      // → prediction uses state's grid region
    },
    [onChange]
  );

  // ── When circle changes, update area list ─────────────────────────────────
  const handleCircleChange = React.useCallback(
    (circle: string) => {
      onChange({ ...value, circle, area: "" });
      const circleAreas = (circleAreaMap[circle] ?? []).sort();
      setAreas(circleAreas);
    },
    [value, onChange, circleAreaMap]
  );

  // ── When area changes ─────────────────────────────────────────────────────
  const handleAreaChange = React.useCallback(
    (area: string) => {
      onChange({ ...value, area });
    },
    [value, onChange]
  );

  const circleOptions = circles.map((c) => ({
    value: c,
    label: formatCircleName(c),
  }));

  const areaOptions = areas.map((a) => ({
    value: a,
    label: formatAreaName(a),
  }));

  const hasCircles = circles.length > 0;
  const hasAreas = areas.length > 0;
  const stateHasGranularData = value.state
    ? STATES_WITH_AREAS.has(value.state)
    : false;

  return (
    <div className="space-y-3">
      {/* ── State ── */}
      <div className="space-y-1.5">
        <label
          htmlFor="select-state"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <MapPin className="h-3 w-3" />
          State / UT
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

      {/* ── Circle / District (only for states with data) ── */}
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
          </label>
          <StyledSelect
            id="select-circle"
            value={value.circle}
            onChange={handleCircleChange}
            disabled={!hasCircles || loadingAreas}
            placeholder={
              loadingAreas ? "Loading circles..." : "Select a circle..."
            }
            options={circleOptions}
            icon={<Layers className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* ── Area (only when circle selected and has areas) ── */}
      {value.circle && hasAreas && (
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
