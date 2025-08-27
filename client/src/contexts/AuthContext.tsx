import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MOCK_USERS, MOCK_COMPANIES, getUserPermissions } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string | null;
}

interface Company {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxUsers: number;
  maxCars: number;
  monthlyRevenue: number;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is stored in localStorage
      const storedAuth = localStorage.getItem('forhandler_auth');
      if (storedAuth) {
        const { user: storedUser, company: storedCompany } = JSON.parse(storedAuth);
        setUser(storedUser);
        setCompany(storedCompany);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string, remember?: boolean): Promise<boolean> => {
    try {
      // Mock authentication
      const foundUser = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (foundUser) {
        const foundCompany = foundUser.companyId ? 
          MOCK_COMPANIES.find(c => c.id === foundUser.companyId) : null;
        
        const authUser = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          companyId: foundUser.companyId
        };
        
        setUser(authUser);
        setCompany(foundCompany || null);
        
        // Store in localStorage if remember is true
        if (remember) {
          localStorage.setItem('forhandler_auth', JSON.stringify({ 
            user: authUser, 
            company: foundCompany 
          }));
        } else {
          sessionStorage.setItem('forhandler_auth', JSON.stringify({ 
            user: authUser, 
            company: foundCompany 
          }));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setCompany(null);
      localStorage.removeItem('forhandler_auth');
      sessionStorage.removeItem('forhandler_auth');
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const hasPermission = (feature: string): boolean => {
    if (!user || !company) return false;
    const permissions = getUserPermissions(user.role, company.subscriptionPlan);
    return permissions[feature as keyof typeof permissions] || false;
  };

  const value = {
    user,
    company,
    isLoading,
    signIn,
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