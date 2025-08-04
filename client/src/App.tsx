import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ProfessionalDashboard from "@/pages/ProfessionalDashboard";
import Cars from "@/pages/Cars";
import CarDetail from "@/pages/CarDetail";
import Customers from "@/pages/Customers";
import CustomerProfile from "@/pages/CustomerProfile";
import Contracts from "@/pages/Contracts";

// Database configuration - easily switch between Replit DB and Supabase
const DATABASE_CONFIG = {
  provider: import.meta.env.VITE_DATABASE_PROVIDER || 'replit', // 'replit' or 'supabase'
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard-pro" component={ProfessionalDashboard} />
          <Route path="/cars" component={Cars} />
          <Route path="/cars/:id" component={CarDetail} />
          <Route path="/customers" component={Customers} />
          <Route path="/customers/:id" component={CustomerProfile} />
          <Route path="/contracts" component={Contracts} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Log database configuration for debugging
  console.log('Database Provider:', DATABASE_CONFIG.provider);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen bg-background">
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
