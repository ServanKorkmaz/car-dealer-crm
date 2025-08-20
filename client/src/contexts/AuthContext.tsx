import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthUser, Department, Organization, OrgRole } from '@shared/auth-types';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  currentDept: Department | null;
  currentOrg: Organization | null; // Keep for compatibility
  userRole: OrgRole | null;
  departments: Department[];
  organizations: Organization[]; // Keep for compatibility
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchDept: (deptId: string) => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>; // Keep for compatibility
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
  const [currentDept, setCurrentDept] = useState<Department | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null); // Keep for compatibility
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]); // Keep for compatibility

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
            setCurrentDept(mockUser.current_dept || mockUser.current_org);
            setCurrentOrg(mockUser.current_org || mockUser.current_dept);
            setUserRole(mockUser.role);
            setDepartments(mockUser.departments || mockUser.organizations || []);
            setOrganizations(mockUser.organizations || mockUser.departments || []);
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
          setCurrentDept(null);
          setCurrentOrg(null);
          setUserRole(null);
          setDepartments([]);
          setOrganizations([]);
          localStorage.removeItem('currentDeptId');
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
      const mockDept: Department = { id: 'default-department', name: 'Hovedavdeling', created_at: new Date(), updated_at: new Date() };
      const mockUser: AuthUser = {
        id: 'test-user-123',
        email: 'test@forhandlerpro.no',
        profile: { user_id: 'test-user-123', full_name: 'Test User', created_at: new Date(), updated_at: new Date() },
        departments: [mockDept],
        current_dept: mockDept,
        organizations: [mockDept], // Keep for compatibility
        current_org: mockDept, // Keep for compatibility
        role: 'owner' as OrgRole,
      };
      
      setUser(mockUser);
      setCurrentDept(mockDept);
      setCurrentOrg(mockDept);
      setUserRole('owner' as OrgRole);
      setDepartments([mockDept]);
      setOrganizations([mockDept]);
      
      // Store in localStorage to persist across reloads
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      localStorage.setItem('currentDeptId', 'default-department');
      localStorage.setItem('currentOrgId', 'default-department'); // Keep for compatibility
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
      setCurrentDept(null);
      setCurrentOrg(null);
      setUserRole(null);
      setDepartments([]);
      setOrganizations([]);
      localStorage.removeItem('mockUser');
      localStorage.removeItem('currentDeptId');
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

  const switchDept = async (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;

    if (!isSupabaseConfigured) {
      // Development mode
      setCurrentDept(dept);
      setCurrentOrg(dept);
      localStorage.setItem('currentDeptId', deptId);
      localStorage.setItem('currentOrgId', deptId);
      return;
    }

    // Get user role for this department
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', deptId)
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .single();

    if (membership) {
      setCurrentDept(dept);
      setCurrentOrg(dept);
      setUserRole(membership.role as OrgRole);
      localStorage.setItem('currentDeptId', deptId);
      localStorage.setItem('currentOrgId', deptId);
    }
  };

  // Keep switchOrg for backwards compatibility
  const switchOrg = async (orgId: string) => {
    await switchDept(orgId);
  };

  const refreshUser = async () => {
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
        currentDept,
        currentOrg,
        userRole,
        departments,
        organizations,
        signIn,
        signUp,
        signOut,
        resetPassword,
        switchDept,
        switchOrg,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}