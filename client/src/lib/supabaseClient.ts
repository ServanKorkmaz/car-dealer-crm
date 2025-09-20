import { createClient } from '@supabase/supabase-js';

// Use the same Supabase instance for admin features
// The credentials are already in the environment from the integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    )
  : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => Boolean(supabase);