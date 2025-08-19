import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireOrg?: boolean;
}

export function ProtectedRoute({ children, requireOrg = true }: ProtectedRouteProps) {
  const { user, isLoading, currentOrg } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated, redirect to login
        setLocation('/login');
      } else if (requireOrg && !currentOrg) {
        // Authenticated but no org, redirect to onboarding
        setLocation('/onboarding');
      }
    }
  }, [user, currentOrg, isLoading, setLocation, requireOrg]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (requireOrg && !currentOrg)) {
    return null;
  }

  return <>{children}</>;
}