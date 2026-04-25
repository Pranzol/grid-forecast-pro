import { useState } from "react";
import { format, addHours, addDays, startOfTomorrow } from "date-fns";
import {
  Activity,
  CalendarIcon,
  Clock,
  Gauge,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  LocationSelector,
  type LocationValue,
} from "./LocationSelector";
import { TimeInput } from "./TimeInput";

export interface FormState {
  location: LocationValue;
  date: Date;
  time: string; // "HH:mm"
  duration: number; // hours
  sqft?: string;
  temperature?: string;
  humidity?: string;
}

interface PredictionFormProps {
  state: FormState;
  setState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  onReset?: () => void;
  loading: boolean;
}

export function PredictionForm({
  state,
  setState,
  onSubmit,
  onReset,
  loading,
}: PredictionFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Card className="bg-surface shadow-elevated border-border/60 animate-fade-in-up">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/15 p-2 text-primary">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Prediction Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Configure forecast parameters
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        {/* ── Location: State → Circle → Area ── */}
        <LocationSelector
          value={state.location}
          onChange={(location) => {
            const updates: Partial<FormState> = { location };
            // Auto-fill weather based on region to avoid manual entry
            if (location.region) {
              const weatherMap: Record<string, { t: string, h: string }> = {
                "Northern": { t: "18", h: "45" },
                "Western": { t: "32", h: "60" },
                "Southern": { t: "35", h: "75" },
                "Eastern": { t: "28", h: "80" },
                "NorthEastern": { t: "22", h: "85" },
              };
              if (weatherMap[location.region]) {
                updates.temperature = weatherMap[location.region].t;
                updates.humidity = weatherMap[location.region].h;
              }
            }
            setState((s) => ({ ...s, ...updates }));
          }}
        />

        {/* ── Target Date ── */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Target Date
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-input/50 border-border hover:bg-input transition-smooth",
                  !state.date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {state.date ? format(state.date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-popover border-border"
              align="start"
            >
              <Calendar
                mode="single"
                selected={state.date}
                onSelect={(date) => {
                  if (date) {
                    setState((s) => ({ ...s, date }));
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Forecast Time ── */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Forecast Time
          </Label>
          <TimeInput
            value={state.time}
            onChange={(time) => setState((s) => ({ ...s, time }))}
          />
          
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[10px] bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-smooth border-border/50"
              onClick={() => {
                const now = new Date();
                setState(s => ({ ...s, date: now, time: format(now, "HH:mm") }));
              }}
            >
              Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[10px] bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-smooth border-border/50"
              onClick={() => {
                const later = addHours(new Date(), 4);
                setState(s => ({ ...s, date: later, time: format(later, "HH:mm") }));
              }}
            >
              In 4 Hours
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[10px] bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-smooth border-border/50"
              onClick={() => {
                const tomorrow = startOfTomorrow();
                setState(s => ({ ...s, date: tomorrow, time: "12:00", duration: 12 }));
              }}
            >
              Tomorrow Peak
            </Button>
          </div>
        </div>

        {/* ── Forecast Window (slider) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-3 w-3" /> Forecast Window
            </Label>
            <span className="font-mono text-sm font-semibold text-primary">
              {state.duration}h
            </span>
          </div>
          <Slider
            min={1}
            max={24}
            step={1}
            value={[state.duration]}
            onValueChange={([v]) =>
              setState((s) => ({ ...s, duration: v }))
            }
            className="py-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>2h</span>
            <span>4h</span>
            <span>6h</span>
            <span>8h</span>
            <span>10h</span>
            <span>12h</span>
            <span>14h</span>
            <span>16h</span>
            <span>18h</span>
            <span>20h</span>
            <span>22h</span>
            <span>24h</span>
          </div>
        </div>

        {/* ── Advanced Weather Parameters ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Temp (°C)
            </Label>
            <Input
              type="number"
              placeholder="e.g. 35"
              value={state.temperature || ""}
              onChange={(e) => setState((s) => ({ ...s, temperature: e.target.value }))}
              className="bg-input/50 border-border hover:bg-input transition-smooth font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Humidity (%)
            </Label>
            <Input
              type="number"
              placeholder="e.g. 60"
              value={state.humidity || ""}
              onChange={(e) => setState((s) => ({ ...s, humidity: e.target.value }))}
              className="bg-input/50 border-border hover:bg-input transition-smooth font-mono"
            />
          </div>
        </div>

        {/* ── Building Size (optional) ── */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Building Size (Sqft){" "}
            <span className="text-[10px] text-muted-foreground/70 normal-case ml-1">
              (Optional)
            </span>
          </Label>
          <Input
            type="number"
            placeholder="e.g. 5000"
            value={state.sqft || ""}
            onChange={(e) => setState((s) => ({ ...s, sqft: e.target.value }))}
            className="bg-input/50 border-border hover:bg-input transition-smooth font-mono"
          />
        </div>

        <div className="flex gap-2 pt-2">
          {onReset && (
            <Button
              variant="outline"
              onClick={onReset}
              disabled={loading}
              className="w-1/3 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-smooth"
            >
              Reset
            </Button>
          )}
          <Button
            onClick={onSubmit}
            disabled={loading || (!state.location.region && !state.location.state)}
            className="flex-1 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-smooth h-10"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Computing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate Forecast
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
