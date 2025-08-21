import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthUser, Organization, OrgRole } from '@shared/auth-types';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  currentOrg: Organization | null;
  userRole: OrgRole | null;
  organizations: Organization[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Fetch user data and organizations
  const fetchUserData = async (userId: string, email: string) => {
    try {
      if (!isSupabaseConfigured) {
        // Mock data for development
        const mockOrg = localStorage.getItem('mockOrg');
        const org = mockOrg ? JSON.parse(mockOrg) : null;
        
        const authUser: AuthUser = {
          id: userId,
          email,
          profile: { user_id: userId, full_name: 'Test User', created_at: new Date(), updated_at: new Date() },
          organizations: org ? [org] : [],
          current_org: org,
          role: 'owner' as OrgRole,
        };

        setUser(authUser);
        setOrganizations(org ? [org] : []);
        setCurrentOrg(org);
        setUserRole('owner' as OrgRole);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get user's organizations
      const { data: orgs } = await supabase
        .from('org_members')
        .select(`
          role,
          organizations (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      const userOrgs = orgs?.map(om => ({
        ...om.organizations,
        role: om.role,
      })) || [];

      // Set current org (first one or from localStorage)
      const savedOrgId = localStorage.getItem('currentOrgId');
      let selectedOrg = userOrgs[0];
      let selectedRole = orgs?.[0]?.role as OrgRole;

      if (savedOrgId) {
        const savedOrg = userOrgs.find(o => o.id === savedOrgId);
        if (savedOrg) {
          selectedOrg = savedOrg;
          const orgMember = orgs?.find(om => om.organizations.id === savedOrgId);
          selectedRole = orgMember?.role as OrgRole;
        }
      }

      const authUser: AuthUser = {
        id: userId,
        email,
        profile: profile || undefined,
        organizations: userOrgs,
        current_org: selectedOrg,
        role: selectedRole,
      };

      setUser(authUser);
      setOrganizations(userOrgs);
      setCurrentOrg(selectedOrg);
      setUserRole(selectedRole);

      if (selectedOrg) {
        localStorage.setItem('currentOrgId', selectedOrg.id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Development mode - check for stored mock user
          const storedUser = localStorage.getItem('mockUser');
          if (storedUser) {
            const mockUser = JSON.parse(storedUser);
            setUser(mockUser);
            setCurrentOrg(mockUser.current_org);
            setUserRole(mockUser.role);
            setOrganizations(mockUser.organizations);
          }
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setSession(session);
          await fetchUserData(session.user.id, session.user.email || '');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes (only in Supabase mode)
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          await fetchUserData(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          setCurrentOrg(null);
          setUserRole(null);
          setOrganizations([]);
          localStorage.removeItem('currentOrgId');
        }

        if (event === 'SIGNED_OUT') {
          setLocation('/login');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [setLocation]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Development mode - simulate login
      console.log('Development mode: simulating login');
      
      // Check if user has completed onboarding
      const mockOrg = localStorage.getItem('mockOrg');
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
      
      let organizations = [];
      let currentOrg = null;
      let role = null;
      
      if (mockOrg && hasCompletedOnboarding) {
        const org = JSON.parse(mockOrg);
        organizations = [{ ...org, role: 'owner' }];
        currentOrg = org;
        role = 'owner' as OrgRole;
      } else {
        // Default org for existing users
        organizations = [{ id: 'default-company', name: 'Test Company', role: 'owner' }];
        currentOrg = { id: 'default-company', name: 'Test Company' };
        role = 'owner' as OrgRole;
      }
      
      const mockUser: AuthUser = {
        id: 'test-user-123',
        email: 'test@forhandlerpro.no',
        profile: { user_id: 'test-user-123', full_name: 'Test User', created_at: new Date(), updated_at: new Date() },
        organizations: organizations,
        current_org: currentOrg,
        role: role,
      };
      
      setUser(mockUser);
      setCurrentOrg(currentOrg);
      setUserRole(role);
      setOrganizations(organizations);
      
      // Store in localStorage to persist across reloads
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      if (currentOrg) {
        localStorage.setItem('currentOrgId', currentOrg.id);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    
    // In mock mode, automatically sign in after signup
    if (!isSupabaseConfigured && data?.user) {
      await fetchUserData(data.user.id, data.user.email || '');
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      // Development mode - clear mock data
      setUser(null);
      setCurrentOrg(null);
      setUserRole(null);
      setOrganizations([]);
      localStorage.removeItem('mockUser');
      localStorage.removeItem('currentOrgId');
      setLocation('/login');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  };

  const switchOrg = async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;

    // Get user role for this org
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .single();

    if (membership) {
      setCurrentOrg(org);
      setUserRole(membership.role as OrgRole);
      localStorage.setItem('currentOrgId', orgId);
      
      // Update user object
      if (user) {
        setUser({
          ...user,
          current_org: org,
          role: membership.role as OrgRole,
        });
      }

      // Refresh the page to reload data with new org context
      window.location.reload();
    }
  };

  const refreshUser = async () => {
    if (!isSupabaseConfigured) {
      // In development mode, check for mock org and update state
      const mockOrg = localStorage.getItem('mockOrg');
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
      
      if (mockOrg && hasCompletedOnboarding) {
        const org = JSON.parse(mockOrg);
        const mockUser: AuthUser = {
          id: 'test-user-123',
          email: 'test@forhandlerpro.no',
          profile: {
            id: 'test-user-123',
            user_id: 'test-user-123',
            display_name: 'Test User',
            avatar_url: null,
          },
          organizations: [org],
          current_org: org,
          role: 'owner' as OrgRole,
        };
        
        setUser(mockUser);
        setCurrentOrg(org);
        setUserRole('owner' as OrgRole);
        setOrganizations([org]);
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
      }
      return;
    }
    
    if (session?.user) {
      await fetchUserData(session.user.id, session.user.email || '');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        currentOrg,
        userRole,
        organizations,
        signIn,
        signUp,
        signOut,
        resetPassword,
        switchOrg,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}