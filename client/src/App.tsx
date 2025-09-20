import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Onboarding from "@/pages/auth/Onboarding";
import Dashboard from "@/pages/Dashboard";
import ProfessionalDashboard from "@/pages/ProfessionalDashboard";
import Cars from "@/pages/Cars";
import CarsInventory from "@/pages/CarsInventory";
import CarDetail from "@/pages/CarDetail";
import CarProfile from "@/pages/CarProfile";
import Customers from "@/pages/Customers";
import CustomerProfile from "@/pages/CustomerProfile";
import { CustomerProfilePage } from "@/pages/CustomerProfilePage";
import Contracts from "@/pages/Contracts";
import SettingsOverviewPage from "@/pages/SettingsOverview";
import AssistantBubble from "@/components/AssistantBubble";
import SimpleAdminPortal from "@/pages/SimpleAdminPortal";
import InviteAccept from "@/pages/InviteAccept";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsOrganization } from "@/pages/settings/SettingsOrganization";
// import { SettingsUsers } from "@/pages/settings/SettingsUsers";
// import { SettingsPlan } from "@/pages/settings/SettingsPlan";

// Database configuration - easily switch between Replit DB and Supabase
const DATABASE_CONFIG = {
  provider: import.meta.env.VITE_DATABASE_PROVIDER || 'replit', // 'replit' or 'supabase'
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/invite" component={InviteAccept} />
      
      {/* Semi-protected routes (need auth but not org) */}
      <Route path="/onboarding">
        <ProtectedRoute requireOrg={false}>
          <Onboarding />
        </ProtectedRoute>
      </Route>
      
      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard-pro">
        <ProtectedRoute>
          <ProfessionalDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/cars">
        <ProtectedRoute>
          <CarsInventory />
        </ProtectedRoute>
      </Route>
      <Route path="/cars/:id">
        <ProtectedRoute>
          <CarDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/cars/:id/profile">
        <ProtectedRoute>
          <CarProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      </Route>
      <Route path="/customers/:id">
        <ProtectedRoute>
          <CustomerProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/customers/:id/profile">
        <ProtectedRoute>
          <CustomerProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/contracts">
        <ProtectedRoute>
          <Contracts />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsOverviewPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings/organisasjon">
        <ProtectedRoute>
          <SettingsOrganization />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <SimpleAdminPortal />
        </ProtectedRoute>
      </Route>
      {/* <Route path="/settings/brukere">
        <ProtectedRoute>
          <SettingsUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/settings/plan">
        <ProtectedRoute>
          <SettingsPlan />
        </ProtectedRoute>
      </Route> */}
      
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrapper component to provide auth context to AssistantBubble
function AssistantBubbleWrapper() {
  const { user, company } = useAuth();
  
  // Only show assistant if user is authenticated and has a company
  if (!user || !company) {
    return null;
  }
  
  // Map auth roles to assistant roles
  const mapRole = (role: string | null): "SELGER" | "EIER" | "REGNSKAP" | "VERKSTED" => {
    if (!role) return "SELGER";
    switch (role.toLowerCase()) {
      case "owner":
      case "admin":
      case "eier":
        return "EIER";
      case "accountant":
      case "regnskap":
        return "REGNSKAP";
      case "workshop":
      case "verksted":
        return "VERKSTED";
      default:
        return "SELGER";
    }
  };
  
  return (
    <AssistantBubble 
      userRole={mapRole(user.role)} 
      activeCompanyId={company.id} 
      userId={user.id} 
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <div className="min-h-screen bg-background">
              <Router />
              <AssistantBubbleWrapper />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
