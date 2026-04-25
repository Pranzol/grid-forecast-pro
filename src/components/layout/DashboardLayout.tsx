import { Outlet, useLocation, Link } from "react-router-dom";
import { format } from "date-fns";
import { Radio, LayoutDashboard, Map, BarChart3, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";

export function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { title: "Forecast Center", path: "/", icon: LayoutDashboard },
    { title: "Regional Heatmap", path: "/heatmap", icon: Map },
    { title: "System Analytics", path: "/analytics", icon: BarChart3 },
    { title: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon" className="border-r border-border/40">
        <SidebarHeader className="py-6">
          <div className="flex items-center gap-4 px-2">
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary-glow/20 p-2 shadow-glow flex items-center justify-center shrink-0 w-12 h-12">
              <img src="/logo.png" alt="EnerPlot Logo" className="h-8 w-8 object-contain drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden overflow-hidden">
              <h1 className="text-3xl font-black tracking-tight leading-none truncate drop-shadow-md">
                Ener<span className="text-gradient-primary">Plot</span>
              </h1>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex flex-col gap-6 pt-4">
          <SidebarMenu className="px-2 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="text-[15px] py-6 rounded-lg font-medium tracking-wide">
                    <Link to={item.path}>
                      <item.icon className="w-5 h-5 mr-1" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          {/* Live System Alerts to fill the empty left space */}
          <div className="group-data-[collapsible=icon]:hidden px-4 mt-6">
            <h3 className="text-xs font-mono font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Radio className="w-3 h-3 text-warning animate-pulse" /> ACTIVE ALERTS
            </h3>
            <div className="space-y-3">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-destructive" />
                <p className="text-xs font-medium text-destructive">Northern Grid Load: 95%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Reserves deployed</p>
              </div>
              <div className="rounded-md border border-warning/20 bg-warning/5 p-2.5 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-warning" />
                <p className="text-xs font-medium text-warning">Weather Anomaly detected</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Western region • +4°C shift</p>
              </div>
            </div>
          </div>
        </SidebarContent>
        
        <SidebarFooter className="pb-4 group-data-[collapsible=icon]:hidden">
           <div className="px-4">
             <div className="h-[1px] w-full bg-border/40 mb-4" />
             <h3 className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground mb-2">NETWORK NODES</h3>
             <div className="grid grid-cols-2 gap-2 text-xs font-mono">
               <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shadow-glow"></div> Alpha</div>
               <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shadow-glow"></div> Beta</div>
               <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shadow-glow"></div> Gamma</div>
               <div className="flex items-center gap-1.5 opacity-50"><div className="w-1.5 h-1.5 rounded-full bg-muted"></div> Delta</div>
             </div>
           </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="w-px h-4 bg-border mx-2" />
            <h2 className="text-sm font-medium text-foreground tracking-wide uppercase font-mono">
              {navItems.find((n) => n.path === location.pathname)?.title || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 shadow-[0_0_10px_rgba(0,255,100,0.1)]">
              <Radio className="h-3 w-3 animate-pulse-glow" />
              <span className="tracking-widest font-bold">ONLINE</span>
            </div>
            <div className="hidden md:block px-2 border-l border-border/60">
              TLS 1.3 SECURE
            </div>
            <div className="px-2 border-l border-border/60 text-foreground/80">
              {format(new Date(), "HH:mm 'UTC'")}
            </div>
          </div>
        </header>
        
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 bg-background relative min-h-screen w-full overflow-x-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
          <div className="relative z-10 w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
