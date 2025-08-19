import { Router } from 'express';
import { z } from 'zod';
import {
  supabase,
  requireAuth,
  requireOrgMember,
  requireRole,
  generateInviteToken,
  generateOrgSlug,
  logAudit,
} from './supabase';
import type {
  CreateOrgRequest,
  InviteUserRequest,
  AcceptInviteRequest,
  ChangePlanRequest,
  UpdateMemberRoleRequest,
  OrgRole,
} from '@shared/auth-types';

const router = Router();

// Validation schemas
const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  orgnr: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional().default('basic'),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'sales', 'workshop', 'accountant', 'viewer']),
});

const acceptInviteSchema = z.object({
  token: z.string().min(32).max(32),
});

const changePlanSchema = z.object({
  plan: z.enum(['basic', 'pro', 'enterprise']),
});

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'sales', 'workshop', 'accountant', 'viewer']),
});

// Get current user with profile and orgs
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user's organizations with roles
    const { data: orgs } = await supabase
      .from('org_members')
      .select(`
        role,
        status,
        organizations (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    res.json({
      id: userId,
      email: req.user!.email,
      profile,
      organizations: orgs?.map(om => ({
        ...om.organizations,
        role: om.role,
      })) || [],
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Create organization
router.post('/org', requireAuth, async (req, res) => {
  try {
    const data = createOrgSchema.parse(req.body);
    const userId = req.user!.id;

    // Generate unique slug
    let slug = generateOrgSlug(data.name);
    let slugSuffix = 0;
    let finalSlug = slug;
    
    while (true) {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', finalSlug)
        .single();
      
      if (!existing) break;
      
      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }

    // Start transaction-like operations
    // 1. Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        orgnr: data.orgnr,
        slug: finalSlug,
        address: data.address,
        phone: data.phone,
        created_by: userId,
      })
      .select()
      .single();

    if (orgError || !org) {
      throw new Error('Failed to create organization');
    }

    // 2. Add creator as owner
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      // Rollback org creation
      await supabase.from('organizations').delete().eq('id', org.id);
      throw new Error('Failed to add owner');
    }

    // 3. Create subscription
    const seats = data.plan === 'basic' ? 3 : data.plan === 'pro' ? 10 : 100;
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        org_id: org.id,
        plan: data.plan || 'basic',
        status: 'trialing',
        seats,
        seats_used: 1,
      });

    if (subError) {
      // Rollback
      await supabase.from('org_members').delete().eq('org_id', org.id);
      await supabase.from('organizations').delete().eq('id', org.id);
      throw new Error('Failed to create subscription');
    }

    // Log audit
    await logAudit(org.id, userId, 'create', 'organization', org.id, { name: data.name });

    res.json({ 
      success: true, 
      organization: org,
      message: 'Organisasjon opprettet' 
    });
  } catch (error) {
    console.error('Create org error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create organization' });
  }
});

// List user's organizations
router.get('/orgs', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: orgs, error } = await supabase
      .from('org_members')
      .select(`
        role,
        joined_at,
        organizations (
          id,
          name,
          slug,
          logo_url
        ),
        subscriptions!inner (
          plan,
          status,
          seats,
          seats_used
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    res.json(orgs || []);
  } catch (error) {
    console.error('List orgs error:', error);
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

// Send invite
router.post('/invites', requireAuth, requireOrgMember('orgId'), requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const userId = req.user!.id;
    const data = inviteUserSchema.parse(req.body);

    // Check if user already exists in org
    const { data: existing } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', 
        supabase.from('profiles').select('user_id').eq('email', data.email).single()
      );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'User already in organization' });
    }

    // Check seat availability
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('seats, seats_used')
      .eq('org_id', orgId)
      .single();

    if (subscription && subscription.seats_used >= subscription.seats) {
      return res.status(400).json({ error: 'No available seats' });
    }

    // Create invite
    const token = generateInviteToken();
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        org_id: orgId,
        email: data.email,
        role: data.role,
        token,
        invited_by: userId,
      })
      .select()
      .single();

    if (error || !invite) {
      throw new Error('Failed to create invite');
    }

    // TODO: Send email with invite link
    const inviteUrl = `${process.env.APP_BASE_URL || 'http://localhost:5000'}/accept-invite?token=${token}`;
    console.log(`Invite email would be sent to ${data.email}:`, inviteUrl);

    // Log audit
    await logAudit(orgId, userId, 'invite_sent', 'user', undefined, { email: data.email, role: data.role });

    res.json({ 
      success: true, 
      invite: { id: invite.id, email: invite.email },
      message: 'Invitasjon sendt' 
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// Accept invite
router.post('/invites/accept', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { token } = acceptInviteSchema.parse(req.body);

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from('invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      
      return res.status(400).json({ error: 'Invite has expired' });
    }

    // Add user to org
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.role as OrgRole,
        invited_by: invite.invited_by,
        status: 'active',
      });

    if (memberError) {
      // Check if already a member
      if (memberError.code === '23505') {
        return res.status(400).json({ error: 'Already a member of this organization' });
      }
      throw memberError;
    }

    // Update invite status
    await supabase
      .from('invites')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    // Update seats used
    await supabase.rpc('increment', {
      table_name: 'subscriptions',
      column_name: 'seats_used',
      row_id: invite.org_id,
    });

    // Get org details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', invite.org_id)
      .single();

    // Log audit
    await logAudit(invite.org_id, userId, 'invite_accepted', 'user', userId, { role: invite.role });

    res.json({ 
      success: true,
      organization: org,
      message: 'Invitasjon akseptert' 
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// Get subscription
router.get('/subscription/:orgId', requireAuth, requireOrgMember('orgId'), async (req, res) => {
  try {
    const orgId = req.params.orgId;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (error || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get effective features
    const { data: features } = await supabase
      .rpc('effective_features', { org_uuid: orgId });

    res.json({
      ...subscription,
      features,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Change plan
router.post('/subscription/:orgId/change-plan', 
  requireAuth, 
  requireOrgMember('orgId'), 
  requireRole(['owner']), 
  async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const userId = req.user!.id;
    const { plan } = changePlanSchema.parse(req.body);

    // Get current subscription
    const { data: current } = await supabase
      .from('subscriptions')
      .select('plan, seats_used')
      .eq('org_id', orgId)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check seat limits for downgrade
    const newSeats = plan === 'basic' ? 3 : plan === 'pro' ? 10 : 100;
    if (newSeats < current.seats_used) {
      return res.status(400).json({ 
        error: `Cannot downgrade: You have ${current.seats_used} users but ${plan} plan only allows ${newSeats}` 
      });
    }

    // Update subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan,
        seats: newSeats,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId);

    if (error) {
      throw error;
    }

    // Log audit
    await logAudit(orgId, userId, 'plan_changed', 'subscription', orgId, { 
      from: current.plan, 
      to: plan 
    });

    res.json({ 
      success: true, 
      message: `Plan endret til ${plan}` 
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// List organization members
router.get('/members/:orgId', 
  requireAuth, 
  requireOrgMember('orgId'), 
  async (req, res) => {
  try {
    const orgId = req.params.orgId;

    const { data: members, error } = await supabase
      .from('org_members')
      .select(`
        user_id,
        role,
        status,
        joined_at,
        profiles!inner (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('org_id', orgId);

    if (error) {
      throw error;
    }

    res.json(members || []);
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

// Update member role
router.put('/members/:orgId/role', 
  requireAuth, 
  requireOrgMember('orgId'), 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const userId = req.user!.id;
    const { user_id: targetUserId, role } = updateRoleSchema.parse(req.body);

    // Can't change own role if you're the only owner
    if (targetUserId === userId && req.user!.role === 'owner') {
      const { data: owners } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .eq('status', 'active');

      if (owners && owners.length === 1) {
        return res.status(400).json({ error: 'Cannot change role of the only owner' });
      }
    }

    // Update role
    const { error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', targetUserId);

    if (error) {
      throw error;
    }

    // Log audit
    await logAudit(orgId, userId, 'role_changed', 'user', targetUserId, { role });

    res.json({ 
      success: true, 
      message: 'Rolle oppdatert' 
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Remove member
router.delete('/members/:orgId/:userId', 
  requireAuth, 
  requireOrgMember('orgId'), 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const targetUserId = req.params.userId;
    const actorUserId = req.user!.id;

    // Can't remove yourself if you're the only owner
    if (targetUserId === actorUserId && req.user!.role === 'owner') {
      const { data: owners } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .eq('status', 'active');

      if (owners && owners.length === 1) {
        return res.status(400).json({ error: 'Cannot remove the only owner' });
      }
    }

    // Remove member
    const { error } = await supabase
      .from('org_members')
      .update({ status: 'revoked' })
      .eq('org_id', orgId)
      .eq('user_id', targetUserId);

    if (error) {
      throw error;
    }

    // Update seats used
    await supabase.rpc('decrement', {
      table_name: 'subscriptions',
      column_name: 'seats_used',
      row_id: orgId,
    });

    // Log audit
    await logAudit(orgId, actorUserId, 'member_removed', 'user', targetUserId);

    res.json({ 
      success: true, 
      message: 'Medlem fjernet' 
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Get effective features
router.get('/features/:orgId', 
  requireAuth, 
  requireOrgMember('orgId'), 
  async (req, res) => {
  try {
    const orgId = req.params.orgId;

    const { data: features, error } = await supabase
      .rpc('effective_features', { org_uuid: orgId });

    if (error) {
      throw error;
    }

    res.json(features || {});
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Failed to get features' });
  }
});

export default router;