import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Forecast from "./pages/Forecast.tsx";
import Heatmap from "./pages/Heatmap.tsx";
import Analytics from "./pages/Analytics.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Zap } from "lucide-react";
import { DashboardLayout } from "./components/layout/DashboardLayout.tsx";

const queryClient = new QueryClient();

const SplashScreen = ({ onEnter }: { onEnter: () => void }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(onEnter, 700); // Wait for the fade-out transition
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-700 ease-in-out overflow-hidden",
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Background ambient effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
      
      {/* Animated geometric background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-info/10 blur-[80px] animate-pulse delay-700" />
      </div>

      <div className="relative flex flex-col items-center z-10 w-full max-w-lg px-6 text-center">
        {/* Logo block */}
        <div className="animate-in fade-in zoom-in-50 duration-1000 ease-out fill-mode-both">
          <div className="relative group">
            <div className="absolute -inset-6 rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/30 transition-colors duration-500 animate-pulse" />
            <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary-glow/20 p-8 shadow-[0_0_50px_-12px_rgba(0,255,255,0.5)] relative border border-primary/30 backdrop-blur-md">
              <Zap className="absolute top-2 right-2 h-4 w-4 text-primary animate-pulse" />
              <img
                src="/logo.png"
                alt="EnerPlot Logo"
                className="h-24 w-24 object-contain drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-12 text-7xl md:text-[8rem] font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both drop-shadow-xl">
          Ener<span className="text-gradient-primary">Plot</span>
        </h1>
        
        {/* Tagline */}
        <p className="mt-6 text-xl md:text-2xl text-muted-foreground font-medium tracking-wide animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500 fill-mode-both">
          Predicting the Pulse of the Power Grid.
        </p>

        {/* Action Button */}
        <div className="mt-14 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700 fill-mode-both">
          <button
            onClick={handleEnter}
            className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-primary/10 px-10 py-5 text-base font-bold text-primary ring-2 ring-primary/40 transition-all hover:bg-primary/20 hover:ring-primary/60 hover:shadow-[0_0_30px_-5px_rgba(0,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-primary/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="tracking-widest uppercase font-mono">Enter Dashboard</span>
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash ? (
          <SplashScreen onEnter={() => setShowSplash(false)} />
        ) : (
          <div className="animate-in fade-in duration-1000 fill-mode-both min-h-screen w-full bg-background">
            <BrowserRouter>
              <Routes>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Forecast />} />
                  <Route path="/heatmap" element={<Heatmap />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
