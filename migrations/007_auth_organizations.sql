-- Auth & Organizations Schema for ForhandlerPRO
-- Adds complete multi-tenant auth with roles, plans, and invitations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  orgnr TEXT,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for slug lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Organization members with roles
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'sales', 'workshop', 'accountant', 'viewer');
CREATE TYPE member_status AS ENUM ('active', 'invited', 'revoked');

CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  status member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Create indexes for member lookups
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);

-- Invitations table
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer',
  token TEXT UNIQUE NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);

-- Create indexes for invite lookups
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_org ON invites(org_id);

-- Subscriptions table
CREATE TYPE plan_type AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

CREATE TABLE IF NOT EXISTS subscriptions (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  plan plan_type NOT NULL DEFAULT 'basic',
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  seats INTEGER NOT NULL DEFAULT 3,
  seats_used INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags table (org-specific overrides)
CREATE TABLE IF NOT EXISTS feature_flags (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit log queries
CREATE INDEX idx_audit_log_org ON audit_log(org_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Update existing tables to add org_id where needed
ALTER TABLE cars ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for org scoping
CREATE INDEX IF NOT EXISTS idx_cars_org ON cars(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(org_id);

-- Helper functions
CREATE OR REPLACE FUNCTION is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = org_uuid
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_orgs()
RETURNS TABLE(org_id UUID, org_name TEXT, org_slug TEXT, user_role org_role) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, om.role
  FROM organizations o
  JOIN org_members om ON o.id = om.org_id
  WHERE om.user_id = auth.uid()
  AND om.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role(org_uuid UUID)
RETURNS org_role AS $$
BEGIN
  RETURN (
    SELECT role FROM org_members
    WHERE org_id = org_uuid
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_plan(org_uuid UUID)
RETURNS plan_type AS $$
BEGIN
  RETURN (
    SELECT plan FROM subscriptions
    WHERE org_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Base feature definitions per plan
CREATE OR REPLACE FUNCTION get_plan_features(plan plan_type)
RETURNS JSONB AS $$
BEGIN
  CASE plan
    WHEN 'basic' THEN
      RETURN jsonb_build_object(
        'max_cars', 50,
        'max_users', 3,
        'max_customers', 100,
        'max_contracts', 50,
        'e_sign', false,
        'poweroffice_integration', false,
        'file_attachments', false,
        'advanced_reports', false,
        'multi_department', false,
        'api_access', false,
        'priority_support', false
      );
    WHEN 'pro' THEN
      RETURN jsonb_build_object(
        'max_cars', 500,
        'max_users', 10,
        'max_customers', 1000,
        'max_contracts', 500,
        'e_sign', true,
        'poweroffice_integration', true,
        'file_attachments', true,
        'advanced_reports', false,
        'multi_department', false,
        'api_access', false,
        'priority_support', false
      );
    WHEN 'enterprise' THEN
      RETURN jsonb_build_object(
        'max_cars', -1,  -- unlimited
        'max_users', -1,  -- unlimited
        'max_customers', -1,  -- unlimited
        'max_contracts', -1,  -- unlimited
        'e_sign', true,
        'poweroffice_integration', true,
        'file_attachments', true,
        'advanced_reports', true,
        'multi_department', true,
        'api_access', true,
        'priority_support', true
      );
    ELSE
      RETURN '{}'::jsonb;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get effective features (plan + overrides)
CREATE OR REPLACE FUNCTION effective_features(org_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  plan_features JSONB;
  custom_features JSONB;
  org_plan plan_type;
BEGIN
  -- Get the org's plan
  SELECT plan INTO org_plan FROM subscriptions WHERE org_id = org_uuid;
  
  -- Get base features for the plan
  plan_features := get_plan_features(org_plan);
  
  -- Get custom overrides if any
  SELECT COALESCE(data, '{}'::jsonb) INTO custom_features
  FROM feature_flags WHERE org_id = org_uuid;
  
  -- Merge (custom overrides base)
  RETURN plan_features || custom_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Organizations policies
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    current_user_role(id) IN ('owner', 'admin')
  );

CREATE POLICY "Any authenticated user can create organization"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only owners can delete organizations"
  ON organizations FOR DELETE
  USING (current_user_role(id) = 'owner');

-- Org members policies
CREATE POLICY "Members can view org membership"
  ON org_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_org_member(org_id)
  );

CREATE POLICY "Owners and admins can manage members"
  ON org_members FOR INSERT
  WITH CHECK (
    current_user_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners and admins can update members"
  ON org_members FOR UPDATE
  USING (
    current_user_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners and admins can remove members"
  ON org_members FOR DELETE
  USING (
    current_user_role(org_id) IN ('owner', 'admin')
  );

-- Invites policies
CREATE POLICY "Owners and admins can view invites"
  ON invites FOR SELECT
  USING (
    current_user_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners and admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    current_user_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners and admins can update invites"
  ON invites FOR UPDATE
  USING (
    current_user_role(org_id) IN ('owner', 'admin')
  );

-- Subscriptions policies
CREATE POLICY "Members can view subscription"
  ON subscriptions FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Only owners can update subscription"
  ON subscriptions FOR UPDATE
  USING (current_user_role(org_id) = 'owner');

CREATE POLICY "System can insert subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (true);  -- Will be handled by service role

-- Feature flags policies
CREATE POLICY "Members can view feature flags"
  ON feature_flags FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Only owners can update feature flags"
  ON feature_flags FOR UPDATE
  USING (current_user_role(org_id) = 'owner');

-- Audit log policies
CREATE POLICY "Members can view org audit log"
  ON audit_log FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);  -- Will be handled by service role

-- Update RLS for existing tables to scope by org
CREATE POLICY "Members can view org cars"
  ON cars FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Sales and above can manage cars"
  ON cars FOR ALL
  USING (
    current_user_role(org_id) IN ('owner', 'admin', 'sales')
  );

CREATE POLICY "Members can view org customers"
  ON customers FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Sales and above can manage customers"
  ON customers FOR ALL
  USING (
    current_user_role(org_id) IN ('owner', 'admin', 'sales')
  );

CREATE POLICY "Members can view org contracts"
  ON contracts FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Sales and above can manage contracts"
  ON contracts FOR ALL
  USING (
    current_user_role(org_id) IN ('owner', 'admin', 'sales', 'accountant')
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();