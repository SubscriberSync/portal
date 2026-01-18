-- Forensic Audit System Schema
-- Purpose: Track SKU mappings, audit runs, and migration results

-- 1. SKU Aliases (The Rosetta Stone)
-- Maps messy historical SKUs to clean box sequence numbers
CREATE TABLE IF NOT EXISTS sku_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  shopify_sku TEXT NOT NULL,
  product_sequence_id INT NOT NULL, -- Box 1 = 1, Box 2 = 2, etc.
  product_name TEXT, -- Optional: "January 2021 Box"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, shopify_sku)
);

-- 2. Migration Runs (Track each audit batch)
CREATE TABLE IF NOT EXISTS migration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_subscribers INT DEFAULT 0,
  processed_subscribers INT DEFAULT 0,
  clean_count INT DEFAULT 0,
  flagged_count INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- Clerk user ID
);

-- 3. Audit Logs (Per-subscriber results)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  migration_run_id UUID REFERENCES migration_runs(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,

  -- Identity (use Shopify Customer ID as primary, email as fallback)
  shopify_customer_id TEXT,
  email TEXT NOT NULL,

  -- Audit Results
  status TEXT NOT NULL CHECK (status IN ('clean', 'flagged', 'resolved', 'skipped')),
  flag_reasons TEXT[] DEFAULT '{}', -- Array: ['gap_detected', 'duplicate_box', 'time_traveler', 'no_history']

  -- Timeline Data
  detected_sequences INT[] DEFAULT '{}', -- [1, 2, 4] - boxes found
  sequence_dates JSONB DEFAULT '[]', -- [{seq: 1, date: '2022-01-01', order_id: '123'}, ...]
  proposed_next_box INT,

  -- Resolution (for flagged records)
  resolved_next_box INT, -- Manually set by user
  resolved_by TEXT, -- Clerk user ID
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  -- Raw Evidence
  raw_orders JSONB DEFAULT '[]', -- Full Shopify order data for reference

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add migration fields to subscribers table
ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS current_product_sequence INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS migration_status TEXT DEFAULT 'pending'
  CHECK (migration_status IN ('pending', 'audited', 'flagged', 'resolved', 'skipped')),
ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT;

-- 5. Add archived status and external order tracking to shipments
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS shopify_order_id TEXT,
ADD COLUMN IF NOT EXISTS is_backfilled BOOLEAN DEFAULT FALSE;

-- Update shipments status enum to include 'Archived'
-- (This is done via CHECK constraint update if needed)

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sku_aliases_org ON sku_aliases(organization_id);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_sku ON sku_aliases(organization_id, shopify_sku);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_run ON audit_logs(migration_run_id);
CREATE INDEX IF NOT EXISTS idx_migration_runs_org ON migration_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_shopify_id ON subscribers(organization_id, shopify_customer_id);

-- RLS Policies
ALTER TABLE sku_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies using org_id from JWT
CREATE POLICY "sku_aliases_org_access" ON sku_aliases FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "migration_runs_org_access" ON migration_runs FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "audit_logs_org_access" ON audit_logs FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

-- Function to increment migration progress atomically
CREATE OR REPLACE FUNCTION increment_migration_progress(
  run_id UUID,
  processed_count INT,
  clean_count INT,
  flagged_count INT
) RETURNS void AS $$
BEGIN
  UPDATE migration_runs
  SET
    processed_subscribers = processed_subscribers + processed_count,
    clean_count = migration_runs.clean_count + increment_migration_progress.clean_count,
    flagged_count = migration_runs.flagged_count + increment_migration_progress.flagged_count
  WHERE id = run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
