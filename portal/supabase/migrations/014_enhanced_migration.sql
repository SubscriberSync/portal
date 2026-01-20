-- Enhanced Migration System Schema
-- Purpose: Support multi-layer matching, AI assist, and improved UX for migration

-- 1. Add migration_complete flag to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS migration_complete BOOLEAN DEFAULT FALSE;

-- 2. Add match_type to sku_aliases for different matching strategies
ALTER TABLE sku_aliases
ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'sku' 
  CHECK (match_type IN ('sku', 'product_name', 'regex'));

-- 3. Product patterns table for product name matching
-- Allows users to define patterns like "Episode {N}" or "Box {N}"
CREATE TABLE IF NOT EXISTS product_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'contains' CHECK (pattern_type IN ('contains', 'regex', 'starts_with', 'ends_with')),
  product_sequence_id INT NOT NULL,
  description TEXT, -- Human readable description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, pattern)
);

-- 4. Unmapped items table for tracking orders that didn't match
-- Users can review these and manually assign box numbers
CREATE TABLE IF NOT EXISTS unmapped_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  migration_run_id UUID REFERENCES migration_runs(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  order_number INT,
  sku TEXT,
  product_name TEXT NOT NULL,
  order_date TIMESTAMPTZ,
  customer_email TEXT,
  shopify_customer_id TEXT,
  -- Resolution tracking
  resolved BOOLEAN DEFAULT FALSE,
  resolved_sequence INT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT, -- Clerk user ID
  resolution_method TEXT CHECK (resolution_method IN ('manual', 'pattern', 'ai_suggest', 'bulk')),
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add migration state tracking to migration_runs
ALTER TABLE migration_runs
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unmapped_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS skipped_count INT DEFAULT 0;

-- 6. Add confidence score to audit_logs for AI-assisted ranking
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2), -- 0.00 to 1.00
ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- Unique constraint for unmapped items (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unmapped_items_unique 
ON unmapped_items(organization_id, shopify_order_id, product_name);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_patterns_org ON product_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_unmapped_items_org ON unmapped_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_unmapped_items_run ON unmapped_items(migration_run_id);
CREATE INDEX IF NOT EXISTS idx_unmapped_items_resolved ON unmapped_items(organization_id, resolved);
CREATE INDEX IF NOT EXISTS idx_unmapped_items_email ON unmapped_items(organization_id, customer_email);

-- RLS Policies
ALTER TABLE product_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmapped_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_patterns_org_access" ON product_patterns FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "unmapped_items_org_access" ON unmapped_items FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

-- Function to get migration progress summary
CREATE OR REPLACE FUNCTION get_migration_progress(org_id TEXT)
RETURNS TABLE (
  total_subscribers BIGINT,
  audited_count BIGINT,
  flagged_count BIGINT,
  resolved_count BIGINT,
  skipped_count BIGINT,
  unmapped_count BIGINT,
  progress_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id)::BIGINT as total_subscribers,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND migration_status = 'audited')::BIGINT as audited_count,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND migration_status = 'flagged')::BIGINT as flagged_count,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND migration_status = 'resolved')::BIGINT as resolved_count,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND migration_status = 'skipped')::BIGINT as skipped_count,
    (SELECT COUNT(*) FROM unmapped_items WHERE organization_id = org_id AND resolved = false)::BIGINT as unmapped_count,
    CASE 
      WHEN (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND migration_status IN ('audited', 'resolved', 'skipped'))::DECIMAL / 
        (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id)::DECIMAL * 100, 
        2
      )
    END as progress_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON TABLE product_patterns IS 'User-defined patterns for matching product names to box sequences (e.g., "Episode 1" -> Box 1)';
COMMENT ON TABLE unmapped_items IS 'Line items from Shopify orders that could not be matched to any SKU or pattern, pending user review';
COMMENT ON COLUMN organizations.migration_complete IS 'True when the forensic audit migration has been completed for this organization';
