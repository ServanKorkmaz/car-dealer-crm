// Database configuration utility
export const dbConfig = {
  provider: import.meta.env.VITE_DATABASE_PROVIDER || 'replit', // 'replit' or 'supabase'
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

// API base URL configuration
export const getApiBaseUrl = () => {
  if (dbConfig.provider === 'supabase') {
    // If using Supabase directly, you might want different endpoints
    return '/api'; // Still use your Express backend as proxy
  }
  return '/api'; // Default to current Express backend
};

// Database provider status
export const getDatabaseStatus = () => {
  const status = {
    provider: dbConfig.provider,
    configured: false,
    ready: false,
  };

  if (dbConfig.provider === 'replit') {
    status.configured = true;
    status.ready = true; // Replit DB is auto-configured
  } else if (dbConfig.provider === 'supabase') {
    status.configured = !!(dbConfig.supabaseUrl && dbConfig.supabaseKey);
    status.ready = status.configured; // Ready if properly configured
  }

  return status;
};

// Log database configuration
console.log('Database Configuration:', {
  provider: dbConfig.provider,
  status: getDatabaseStatus(),
});