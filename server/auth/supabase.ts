import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import type { OrgRole } from '@shared/auth-types';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: OrgRole;
        org_id?: string;
      };
    }
  }
}

// Auth middleware - verify JWT token
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || '',
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Organization member middleware
export function requireOrgMember(paramName: string = 'orgId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const orgId = req.params[paramName] || req.body.org_id || req.query.org_id;
      
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Check membership
      const { data: membership, error } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .single();

      if (error || !membership) {
        return res.status(403).json({ error: 'Not a member of this organization' });
      }

      // Attach org and role to request
      req.user.org_id = orgId;
      req.user.role = membership.role as OrgRole;

      next();
    } catch (error) {
      console.error('Org member middleware error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
}

// Role-based access control middleware
export function requireRole(roles: OrgRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
}

// Feature gate middleware
export function requireFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.org_id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get effective features for org
      const { data: features, error } = await supabase
        .rpc('effective_features', { org_uuid: req.user.org_id });

      if (error) {
        console.error('Feature check error:', error);
        return res.status(500).json({ error: 'Failed to check features' });
      }

      if (!features || !features[feature]) {
        return res.status(403).json({ 
          error: 'Feature not available', 
          message: `This feature requires a higher plan` 
        });
      }

      next();
    } catch (error) {
      console.error('Feature gate middleware error:', error);
      res.status(500).json({ error: 'Feature check failed' });
    }
  };
}

// Audit log helper
export async function logAudit(
  orgId: string,
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, any>
) {
  try {
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: userId,
      action,
      entity,
      entity_id: entityId,
      meta: meta || {},
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the request
  }
}

// Helper to generate invite token
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Helper to generate org slug
export function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}