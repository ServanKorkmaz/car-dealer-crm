import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login, logout, getCurrentUser, type AuthUser, type AuthCompany } from '@/lib/authApi';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: AuthUser | null;
  company: AuthCompany | null;
  isLoading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.user);
      setCompany(response.company || null);
    } catch (error) {
      // User not authenticated, this is normal
      setUser(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string, remember?: boolean): Promise<boolean> => {
    try {
      const response = await login({ email, password, remember });
      setUser(response.user);
      setCompany(response.company || null);
      return true;
    } catch (error: any) {
      toast({
        title: 'Innlogging feilet',
        description: error.message || 'Kunne ikke logge inn. Sjekk e-post og passord.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    try {
      // Import Supabase client for signup
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // For development with mock auth, the user will be automatically set
      if (data?.user) {
        console.log('User registered successfully:', data.user.email);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Kunne ikke opprette konto');
    }
  };

  const signOut = async () => {
    try {
      await logout();
      setUser(null);
      setCompany(null);
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        title: 'Utlogging feilet',
        description: error.message || 'En feil oppstod under utlogging.',
        variant: 'destructive',
      });
    }
  };

  const hasPermission = (feature: string): boolean => {
    if (!user || !company) return false;
    
    // Simple permission check based on role and subscription plan
    const permissions: Record<string, boolean> = {
      canCreateCars: true,
      canEditCars: true,
      canDeleteCars: user.role === 'admin' || user.role === 'org_admin',
      canCreateCustomers: true,
      canEditCustomers: true,
      canDeleteCustomers: user.role === 'admin' || user.role === 'org_admin',
      canCreateContracts: true,
      canEditContracts: true,
      canDeleteContracts: user.role === 'admin' || user.role === 'org_admin',
      canViewAnalytics: company.subscriptionPlan !== 'light',
      canManageUsers: user.role === 'admin' || user.role === 'org_admin',
      canManageSubscription: user.role === 'admin' || user.role === 'org_admin',
      canViewAllData: user.role === 'admin' || user.role === 'org_admin',
    };

    return permissions[feature] || false;
  };

  const value = {
    user,
    company,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};