import { useState } from "react";
import { format } from "date-fns";
import { Activity, Radio } from "lucide-react";
import { PredictionForm, type FormState } from "@/components/grid/PredictionForm";
import { ResultsPanel } from "@/components/grid/ResultsPanel";
import {
  fetchPredictionData,
  type PredictionResponse,
} from "@/lib/fetchPredictionData";
import { toast } from "@/hooks/use-toast";

const Forecast = () => {
  const [form, setForm] = useState<FormState>({
    location: { region: "", state: "", circle: "", division: "", area: "" },
    date: new Date(),
    time: "13:00",
    duration: 1,
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PredictionResponse | null>(null);

  const handleSubmit = async () => {
    if (!form.location.region && !form.location.state) {
      toast({
        title: "Please select a location",
        description: "Choose a Region or State before generating a forecast.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await fetchPredictionData(
        form.location,
        format(form.date, "yyyy-MM-dd"),
        form.time,
        form.duration,
        form.sqft ? parseFloat(form.sqft) : undefined
      );
      setData(result);

      // Build a friendly location label
      const locationLabel =
        form.location.area ||
        form.location.circle ||
        form.location.state ||
        form.location.region;

      toast({
        title: "Forecast generated",
        description: `${locationLabel} • ${result.predictedDemandMW.toLocaleString()} MW predicted`,
      });
    } catch (err) {
      toast({
        title: "Forecast failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      location: { region: "", state: "", circle: "", division: "", area: "" },
      date: new Date(),
      time: "13:00",
      duration: 1,
      sqft: "",
    });
    setData(null);
    toast({
      title: "System Reset",
      description: "Forecast configuration cleared.",
    });
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Forecast Center
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Generate AI-driven short-term electricity demand forecasts for
            municipal grid planning, load balancing, and reserve allocation.
          </p>
        </div>
        
        {/* Live AC Wave Widget */}
        <div className="hidden lg:flex items-center gap-4 bg-surface/50 border border-border/60 rounded-xl p-3 shadow-inner">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Grid Frequency</span>
            <span className="text-lg font-bold font-mono text-success">50.02 Hz</span>
          </div>
          <div className="h-8 w-24 relative overflow-hidden flex items-center">
            {/* Animated SVG Sine Wave */}
            <svg viewBox="0 0 100 20" className="w-full h-full stroke-success fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0,10 Q12.5,0 25,10 T50,10 T75,10 T100,10" className="animate-[dash_1.5s_linear_infinite]" strokeDasharray="100" strokeDashoffset="0">
                <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-surface/80 via-transparent to-surface/80 pointer-events-none" />
          </div>
          <div className="flex flex-col border-l border-border/60 pl-4">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Voltage</span>
            <span className="text-sm font-bold font-mono">400 kV</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <PredictionForm
            state={form}
            setState={setForm}
            onSubmit={handleSubmit}
            onReset={handleReset}
            loading={loading}
          />
        </aside>

        <section>
          <ResultsPanel data={data} loading={loading} />
        </section>
      </div>
    </div>
  );
};

export default Forecast;
