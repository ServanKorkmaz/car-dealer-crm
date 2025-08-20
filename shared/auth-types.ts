// Authentication and Organization Types

export type OrgRole = 'owner' | 'admin' | 'sales' | 'workshop' | 'accountant' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'revoked';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type PlanType = 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface Profile {
  user_id: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: string;
  name: string;
  orgnr?: string;
  slug?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// Keep Organization as alias for backwards compatibility
export interface Organization extends Department {}

export interface DeptMember {
  dept_id: string;
  user_id: string;
  role: OrgRole;
  invited_by?: string;
  status: MemberStatus;
  joined_at: Date;
  // Joined data
  user?: Profile;
  department?: Department;
}

// Keep OrgMember as alias for backwards compatibility
export interface OrgMember extends Omit<DeptMember, 'dept_id' | 'department'> {
  org_id: string;
  organization?: Organization;
}

export interface Invite {
  id: string;
  dept_id: string;
  email: string;
  role: OrgRole;
  token: string;
  status: InviteStatus;
  invited_by?: string;
  created_at: Date;
  expires_at: Date;
  accepted_at?: Date;
  // Keep org_id for compatibility
  org_id?: string;
}

export interface Subscription {
  org_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  trial_end?: Date;
  seats: number;
  seats_used: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start: Date;
  current_period_end: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FeatureFlags {
  org_id: string;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_user_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  meta?: Record<string, any>;
  created_at: Date;
}

// Feature definitions
export interface PlanFeatures {
  max_cars: number;
  max_users: number;
  max_customers: number;
  max_contracts: number;
  e_sign: boolean;
  poweroffice_integration: boolean;
  file_attachments: boolean;
  advanced_reports: boolean;
  multi_department: boolean;
  api_access: boolean;
  priority_support: boolean;
}

// API request/response types
export interface CreateOrgRequest {
  name: string;
  orgnr?: string;
  address?: string;
  phone?: string;
  plan?: PlanType;
}

export interface InviteUserRequest {
  email: string;
  role: OrgRole;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface ChangePlanRequest {
  plan: PlanType;
}

export interface UpdateMemberRoleRequest {
  user_id: string;
  role: OrgRole;
}

// Auth context types
export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  departments?: Department[];
  current_dept?: Department;
  role?: OrgRole;
  // Keep organizations for backwards compatibility
  organizations?: Organization[];
  current_org?: Organization;
}

// Plan pricing (for display)
export const PLAN_PRICING = {
  basic: {
    name: 'Basic',
    price: 999,
    currency: 'NOK',
    interval: 'måned',
    features: {
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
  },
  pro: {
    name: 'Pro',
    price: 2499,
    currency: 'NOK',
    interval: 'måned',
    features: {
      max_cars: 500,
      max_users: 10,
      max_customers: 1000,
      max_contracts: 500,
      e_sign: true,
      poweroffice_integration: true,
      file_attachments: true,
      advanced_reports: false,
      multi_department: false,
      api_access: false,
      priority_support: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // Custom pricing
    currency: 'NOK',
    interval: 'måned',
    features: {
      max_cars: -1,
      max_users: -1,
      max_customers: -1,
      max_contracts: -1,
      e_sign: true,
      poweroffice_integration: true,
      file_attachments: true,
      advanced_reports: true,
      multi_department: true,
      api_access: true,
      priority_support: true,
    },
  },
};

// Role permissions matrix
export const ROLE_PERMISSIONS = {
  owner: {
    cars: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    contracts: ['create', 'read', 'update', 'delete'],
    accounting: ['create', 'read', 'update', 'delete'],
    settings: ['create', 'read', 'update', 'delete'],
    billing: ['create', 'read', 'update', 'delete'],
    members: ['create', 'read', 'update', 'delete'],
  },
  admin: {
    cars: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    contracts: ['create', 'read', 'update', 'delete'],
    accounting: ['create', 'read', 'update', 'delete'],
    settings: ['create', 'read', 'update'],
    billing: ['read'],
    members: ['create', 'read', 'update', 'delete'],
  },
  sales: {
    cars: ['create', 'read', 'update'],
    customers: ['create', 'read', 'update'],
    contracts: ['create', 'read', 'update'],
    accounting: [],
    settings: ['read'],
    billing: [],
    members: ['read'],
  },
  workshop: {
    cars: ['read', 'update'],
    customers: ['read'],
    contracts: ['read'],
    accounting: [],
    settings: [],
    billing: [],
    members: [],
  },
  accountant: {
    cars: ['read'],
    customers: ['read'],
    contracts: ['read', 'update'],
    accounting: ['create', 'read', 'update'],
    settings: ['read'],
    billing: ['read'],
    members: ['read'],
  },
  viewer: {
    cars: ['read'],
    customers: ['read'],
    contracts: ['read'],
    accounting: ['read'],
    settings: [],
    billing: [],
    members: ['read'],
  },
};