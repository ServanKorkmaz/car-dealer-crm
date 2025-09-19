import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for usage tracking
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Only initialize if we have the service key
const supabaseAdmin = SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
}) : null;

// Default org ID for main app (you can make this configurable)
const DEFAULT_ORG_ID = 'a1111111-1111-1111-1111-111111111111';

// Track user sessions (user_id -> last activity time)
const activeSessions = new Map<string, number>();

export class UsageTracker {
  static async trackEvent(userId: string | null, event: string, metadata?: any) {
    if (!supabaseAdmin) {
      console.log('[UsageTracker] Supabase not configured, skipping event:', event);
      return;
    }

    try {
      // Update active session
      if (userId) {
        activeSessions.set(userId, Date.now());
      }

      // Insert usage event
      const { error } = await supabaseAdmin
        .from('usage_events')
        .insert({
          org_id: DEFAULT_ORG_ID,
          user_id: userId,
          event,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[UsageTracker] Failed to track event:', error);
      }
    } catch (err) {
      console.error('[UsageTracker] Error tracking event:', err);
    }
  }

  static async syncUser(userId: string, email: string, fullName?: string, role: string = 'user') {
    if (!supabaseAdmin) return;

    try {
      // First, ensure user exists in Supabase auth.users (via profiles table)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userId,
          full_name: fullName || email.split('@')[0],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error('[UsageTracker] Failed to sync profile:', profileError);
      }

      // Then ensure user is member of the organization
      const { data: existingMember } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('org_id', DEFAULT_ORG_ID)
        .eq('user_id', userId)
        .single();

      if (!existingMember) {
        const { error: memberError } = await supabaseAdmin
          .from('org_members')
          .insert({
            org_id: DEFAULT_ORG_ID,
            user_id: userId,
            role: role
          });

        if (memberError) {
          console.error('[UsageTracker] Failed to add org member:', memberError);
        } else {
          console.log(`[UsageTracker] Added user ${email} to org`);
        }
      }
    } catch (err) {
      console.error('[UsageTracker] Error syncing user:', err);
    }
  }

  static async sendHeartbeat(userId: string) {
    if (!supabaseAdmin || !userId) return;

    const lastActivity = activeSessions.get(userId);
    const now = Date.now();
    
    // Send heartbeat every 60 seconds if user is active
    if (!lastActivity || now - lastActivity > 60000) {
      await this.trackEvent(userId, 'heartbeat', { source: 'main_app' });
      activeSessions.set(userId, now);
    }
  }

  static async ensureOrgExists() {
    if (!supabaseAdmin) return;

    try {
      // Check if org exists
      const { data: existingOrg } = await supabaseAdmin
        .from('orgs')
        .select('id')
        .eq('id', DEFAULT_ORG_ID)
        .single();

      if (!existingOrg) {
        // Create default org for main app (without user_id since it's a system org)
        const { error } = await supabaseAdmin
          .from('orgs')
          .insert({
            id: DEFAULT_ORG_ID,
            name: 'ForhandlerPRO Main',
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('[UsageTracker] Failed to create org:', error);
        } else {
          console.log('[UsageTracker] Created default org for main app');
        }
      }
    } catch (err) {
      // Error might be expected if org already exists
      console.log('[UsageTracker] Org status:', err);
    }
  }
}

// Initialize on startup
UsageTracker.ensureOrgExists();