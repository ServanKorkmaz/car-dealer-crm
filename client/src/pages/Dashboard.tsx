import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Maximize2, Minimize2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import SummaryCards from "@/components/dashboard/SummaryCards";
import RecentCars from "@/components/dashboard/RecentCars";
import QuickActions from "@/components/dashboard/QuickActions";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [compactView, setCompactView] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorisert",
        description: "Du er ikke logget inn. Logger inn på nytt...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  return (
    <MainLayout>
      <div className={compactView ? "space-y-3" : "space-y-6"}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Oversikt over ditt bilforhandleri</p>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="compact-view" className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
              {compactView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              Kompakt visning
            </Label>
            <Switch
              id="compact-view"
              checked={compactView}
              onCheckedChange={setCompactView}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        <SummaryCards compact={compactView} />

        <div className={`grid grid-cols-1 lg:grid-cols-3 ${compactView ? "gap-3" : "gap-4"}`}>
          <div className="lg:col-span-2">
            <RecentCars />
          </div>
          <div className={compactView ? "space-y-3" : "space-y-4"}>
            <QuickActions />
            <ActivityFeed limit={compactView ? 5 : 8} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
