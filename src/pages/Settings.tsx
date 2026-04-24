import { useState } from "react";
import { User, Bell, Shield, LogOut, SlidersHorizontal, Settings2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");

  const handleSignOut = () => {
    toast({
      title: "Signed Out",
      description: "You have been securely signed out of the command console.",
    });
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Manage your account preferences, telemetry configurations, and security protocols.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Navigation Sidebar inside Settings */}
        <div className="space-y-3">
          <Button 
            variant={activeTab === "account" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-3 py-6 text-base font-medium ${activeTab === "account" ? "bg-surface shadow-md border border-primary/20" : "hover:bg-surface/50"}`}
            onClick={() => setActiveTab("account")}
          >
            <User className="h-5 w-5" /> Account Details
          </Button>
          <Button 
            variant={activeTab === "configs" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-3 py-6 text-base font-medium ${activeTab === "configs" ? "bg-surface shadow-md border border-primary/20" : "hover:bg-surface/50"}`}
            onClick={() => setActiveTab("configs")}
          >
            <SlidersHorizontal className="h-5 w-5" /> Region Configs
          </Button>
          <Button 
            variant={activeTab === "notifications" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-3 py-6 text-base font-medium ${activeTab === "notifications" ? "bg-surface shadow-md border border-primary/20" : "hover:bg-surface/50"}`}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell className="h-5 w-5" /> Notifications
          </Button>
          <Button 
            variant={activeTab === "security" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-3 py-6 text-base font-medium ${activeTab === "security" ? "bg-surface shadow-md border border-primary/20" : "hover:bg-surface/50"}`}
            onClick={() => setActiveTab("security")}
          >
            <Shield className="h-5 w-5" /> Security & Logs
          </Button>
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "account" && (
            <Card className="bg-surface shadow-elevated border-border/60 animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Operator Profile
                </CardTitle>
                <CardDescription>Update your personal command center details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase font-mono">Operator ID</Label>
                    <div className="font-medium text-sm p-2 bg-background rounded-md border border-border/50">
                      OP-7489-TGNPDCL
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase font-mono">Clearance Level</Label>
                    <div className="font-medium text-sm p-2 bg-background rounded-md border border-border/50 text-warning">
                      Level 4 (Regional Admin)
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground uppercase font-mono">Assigned Region</Label>
                    <div className="font-medium text-sm p-2 bg-background rounded-md border border-border/50 flex items-center justify-between">
                      <span>Southern Region (Telangana Sector)</span>
                      <Settings2 className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "configs" && (
            <Card className="bg-surface shadow-elevated border-border/60 animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Telemetry Preferences
                </CardTitle>
                <CardDescription>Configure how prediction models and map data behave.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Real-time GIS Sync</Label>
                    <p className="text-xs text-muted-foreground">Keep the regional heatmap synchronized with live node data.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aggressive Caching</Label>
                    <p className="text-xs text-muted-foreground">Cache model predictions locally to speed up Forecast Center loads.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-destructive">Critical Load Alerts</Label>
                    <p className="text-xs text-muted-foreground">Override system audio to play a siren when load exceeds 95% capacity.</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="bg-surface shadow-elevated border-border/60 animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Routing
                </CardTitle>
                <CardDescription>Manage how system alerts are delivered to you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Dispatch</Label>
                    <p className="text-xs text-muted-foreground">Send high-priority alerts directly to registered mobile device.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Digest</Label>
                    <p className="text-xs text-muted-foreground">Receive a daily summary of regional model predictions.</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <>
              {/* System Activity Logs */}
              <Card className="bg-surface shadow-elevated border-border/60 animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    System Activity Log
                  </CardTitle>
                  <CardDescription>Audit trail of recent terminal commands and AI operations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: "04:12:33 UTC", user: "OP-7489", action: "Generated forecast (Southern Region)", status: "success" },
                      { time: "04:05:12 UTC", user: "SYSTEM-AI", action: "Load shift recommended: Northern to Western", status: "warning" },
                      { time: "03:45:00 UTC", user: "SYSTEM-AI", action: "Automated model retraining completed", status: "success" },
                      { time: "02:10:44 UTC", user: "ADMIN-01", action: "Updated grid baseline thresholds", status: "info" },
                    ].map((log, i) => (
                      <div key={i} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{log.user}</span>
                            <span className="text-sm font-medium">{log.action}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{log.time}</div>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-1 ${
                          log.status === 'success' ? 'bg-success' : 
                          log.status === 'warning' ? 'bg-warning animate-pulse' : 'bg-info'
                        }`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sign Out Section */}
              <Card className="bg-destructive/5 border-destructive/20 shadow-none mt-6 animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                    <ShieldAlert className="h-5 w-5" />
                    Session Management
                  </CardTitle>
                  <CardDescription>
                    Securely disconnect your terminal from the central grid authority network.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="destructive" className="w-full sm:w-auto gap-2 font-mono uppercase tracking-widest" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Terminate Session
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
