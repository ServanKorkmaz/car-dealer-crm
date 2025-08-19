import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials not configured. Using mock auth for development.');
}

// Create Supabase client only if credentials are available
// Otherwise, create a mock client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : {
      // Mock Supabase client for development
      auth: {
        getSession: async () => ({ 
          data: { 
            session: localStorage.getItem('mockSession') ? {
              access_token: 'mock-token',
              user: JSON.parse(localStorage.getItem('mockUser') || '{}'),
            } : null 
          }, 
          error: null 
        }),
        getUser: async (token: string) => ({
          data: { 
            user: localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser') || '{}') : null
          },
          error: null
        }),
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          if (email && password.length >= 6) {
            const mockUser = { id: 'mock-user-123', email };
            localStorage.setItem('mockSession', 'true');
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
            return { data: { user: mockUser, session: { access_token: 'mock-token', user: mockUser } }, error: null };
          }
          return { data: null, error: new Error('Invalid credentials') };
        },
        signUp: async ({ email, password }: { email: string; password: string }) => {
          if (email && password.length >= 6) {
            const mockUser = { id: 'mock-user-123', email };
            localStorage.setItem('mockSession', 'true');
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
            return { data: { user: mockUser, session: { access_token: 'mock-token', user: mockUser } }, error: null };
          }
          return { data: null, error: new Error('Invalid signup data') };
        },
        signOut: async () => {
          localStorage.removeItem('mockSession');
          localStorage.removeItem('mockUser');
          localStorage.removeItem('mockOrg');
          return { error: null };
        },
        onAuthStateChange: (callback: Function) => {
          // Mock auth state listener
          window.addEventListener('storage', () => {
            const user = localStorage.getItem('mockUser');
            if (user) {
              callback('SIGNED_IN', { user: JSON.parse(user), access_token: 'mock-token' });
            } else {
              callback('SIGNED_OUT', null);
            }
          });
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        resetPasswordForEmail: async () => ({ error: null }),
        signInWithOAuth: async () => ({ error: new Error('OAuth not available in development mode') }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (field: string, value: any) => ({
            single: async () => {
              // Mock database responses
              if (table === 'profiles') {
                return { data: { user_id: 'mock-user-123', full_name: 'Test User' }, error: null };
              }
              if (table === 'organizations') {
                const mockOrg = localStorage.getItem('mockOrg');
                return { data: mockOrg ? JSON.parse(mockOrg) : null, error: null };
              }
              if (table === 'org_members') {
                return { 
                  data: { 
                    role: 'owner',
                    organizations: JSON.parse(localStorage.getItem('mockOrg') || '{}'),
                  }, 
                  error: null 
                };
              }
              return { data: null, error: null };
            },
            select: () => ({ data: [], error: null }),
          }),
          data: [],
          error: null,
        }),
        insert: (data: any) => ({
          select: () => ({
            single: async () => {
              if (table === 'organizations') {
                const org = { ...data, id: 'mock-org-123' };
                localStorage.setItem('mockOrg', JSON.stringify(org));
                return { data: org, error: null };
              }
              return { data, error: null };
            },
          }),
        }),
        update: (data: any) => ({
          eq: () => ({ data: null, error: null }),
        }),
        delete: () => ({
          eq: () => ({ data: null, error: null }),
        }),
      }),
      rpc: async (funcName: string, params: any) => {
        // Mock RPC calls
        if (funcName === 'effective_features') {
          return {
            data: {
              max_cars: 50,
              max_users: 3,
              max_customers: 100,
              max_contracts: 50,
              e_sign: false,
              poweroffice_integration: false,
              file_attachments: false,
              advanced_reports: false,
              multi_department: false,
              api_access: false,
              priority_support: false,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
    } as any;

// Helper to get auth headers
export function getAuthHeaders() {
  if (isSupabaseConfigured) {
    const session = supabase.auth.getSession();
    if (session) {
      return {
        'Authorization': `Bearer ${session}`,
      };
    }
  } else {
    // Mock auth headers for development
    if (localStorage.getItem('mockSession')) {
      return {
        'Authorization': 'Bearer mock-token',
      };
    }
  }
  return {};
}