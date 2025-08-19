-- PowerOffice Go Accounting Integration Tables

-- Accounting provider settings per organization
CREATE TABLE IF NOT EXISTS accounting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('powerofficego', 'tripletex', 'uni')),
  project_code TEXT,
  department_code TEXT,
  default_payment_terms INTEGER DEFAULT 14,
  invoice_delivery_channel TEXT DEFAULT 'email',
  access_token TEXT, -- Will be encrypted at application layer
  refresh_token TEXT, -- Will be encrypted at application layer
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT FALSE,
  connected_org_name TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider)
);

-- VAT code mappings per category
CREATE TABLE IF NOT EXISTS accounting_vat_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('car', 'addon', 'part', 'labor', 'fee', 'registreringsavgift')),
  local_vat_label TEXT NOT NULL,
  remote_vat_code TEXT NOT NULL,
  vat_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider, category)
);

-- GL account mappings per category
CREATE TABLE IF NOT EXISTS accounting_account_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('car', 'addon', 'part', 'labor', 'fee', 'registreringsavgift')),
  income_account TEXT,
  cogs_account TEXT,
  inventory_account TEXT,
  fee_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider, category)
);

-- Links between local and remote entities
CREATE TABLE IF NOT EXISTS accounting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'item', 'contract', 'order', 'invoice', 'payment')),
  local_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  remote_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, entity_type, local_id)
);

-- Sync queue for async operations
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'failed', 'done', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync log for audit trail
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  local_id TEXT,
  remote_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'warning')),
  message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment status tracking
CREATE TABLE IF NOT EXISTS accounting_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  contract_id TEXT REFERENCES contracts(id),
  payment_date DATE,
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'NOK',
  payment_method TEXT,
  reference TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  remote_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add accounting status to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_status TEXT 
  CHECK (accounting_status IN ('draft', 'order_sent', 'invoiced', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'));
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_order_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_invoice_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_invoice_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_last_sync_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accounting_due_date DATE;

-- Indexes for performance
CREATE INDEX idx_accounting_settings_company ON accounting_settings(company_id);
CREATE INDEX idx_accounting_links_lookup ON accounting_links(provider, entity_type, local_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status, next_retry_at) WHERE status IN ('queued', 'failed');
CREATE INDEX idx_sync_log_company_date ON sync_log(company_id, created_at DESC);
CREATE INDEX idx_accounting_payments_contract ON accounting_payments(contract_id);

-- Enable RLS
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_vat_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_account_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company accounting settings" ON accounting_settings
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "Only EIER and REGNSKAP can manage accounting settings" ON accounting_settings
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = current_user_id() 
      AND role IN ('EIER', 'REGNSKAP')
    )
  );

CREATE POLICY "Users can view their company VAT mappings" ON accounting_vat_map
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "Only EIER and REGNSKAP can manage VAT mappings" ON accounting_vat_map
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = current_user_id() 
      AND role IN ('EIER', 'REGNSKAP')
    )
  );

CREATE POLICY "Users can view their company account mappings" ON accounting_account_map
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "Only EIER and REGNSKAP can manage account mappings" ON accounting_account_map
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = current_user_id() 
      AND role IN ('EIER', 'REGNSKAP')
    )
  );

CREATE POLICY "Users can view their company accounting links" ON accounting_links
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "Only EIER and REGNSKAP can manage accounting links" ON accounting_links
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = current_user_id() 
      AND role IN ('EIER', 'REGNSKAP')
    )
  );

CREATE POLICY "Users can view their company sync queue" ON sync_queue
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "Only EIER and REGNSKAP can manage sync queue" ON sync_queue
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = current_user_id() 
      AND role IN ('EIER', 'REGNSKAP')
    )
  );

CREATE POLICY "Users can view their company sync log" ON sync_log
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "System can insert sync log entries" ON sync_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their company payments" ON accounting_payments
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM memberships WHERE user_id = current_user_id()
  ));

CREATE POLICY "Only EIER and REGNSKAP can manage payments" ON accounting_payments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = current_user_id() 
      AND role IN ('EIER', 'REGNSKAP')
    )
  );