import { useState } from "react";
import { format } from "date-fns";
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
}

interface PredictionFormProps {
  state: FormState;
  setState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  loading: boolean;
}

export function PredictionForm({
  state,
  setState,
  onSubmit,
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
          onChange={(location) => setState((s) => ({ ...s, location }))}
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

        <Button
          onClick={onSubmit}
          disabled={loading || (!state.location.region && !state.location.state)}
          className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-smooth h-11"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Computing forecast...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate Grid Forecast
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
