import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Use Replit's built-in PostgreSQL URL when Supabase is not configured
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-dev';

const supabase = createClient(
  supabaseUrl!,
  supabaseKey!,
  { auth: { persistSession: false } }
);

export default supabase;