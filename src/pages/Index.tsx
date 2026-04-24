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

const Index = () => {
  const [form, setForm] = useState<FormState>({
    city: "Bengaluru",
    date: new Date(),
    time: "13:00",
    duration: 1,
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PredictionResponse | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await fetchPredictionData(
        form.city,
        format(form.date, "yyyy-MM-dd"),
        form.time,
        form.duration,
        form.sqft ? parseFloat(form.sqft) : undefined
      );
      setData(result);
      toast({
        title: "Forecast generated",
        description: `${result.city} • ${result.predictedDemandMW.toLocaleString()} MW predicted`,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary-glow/20 p-1.5 shadow-glow flex items-center justify-center">
                <img src="/logo.png" alt="EnerPlot Logo" className="h-7 w-7 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">
                Ener<span className="text-gradient-primary">Plot</span>
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                Short-Term Demand Prediction System
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-success animate-pulse-glow" />
            <span className="font-mono">SYSTEM ONLINE</span>
            <span className="mx-2 h-3 w-px bg-border" />
            <span className="font-mono">{format(new Date(), "HH:mm 'UTC'")}</span>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Grid Operations Console
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Generate AI-driven short-term electricity demand forecasts for
            municipal grid planning, load balancing, and reserve allocation.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PredictionForm
              state={form}
              setState={setForm}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </aside>

          <section>
            <ResultsPanel data={data} loading={loading} />
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60 mt-12">
        <div className="container px-4 md:px-6 py-4 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>© EnerPlot · Operator Console v1.0</span>
          <span className="hidden sm:inline">Secure connection · TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
