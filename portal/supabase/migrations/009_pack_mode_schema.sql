-- Migration: Pack Mode & Supporting Tables
-- Description: Adds tables and columns needed for pack mode, shipping, and general operations

-- =============================================
-- 1. Print Batches Table
-- =============================================
-- Tracks groups of shipping labels printed together

CREATE TABLE IF NOT EXISTS print_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  batch_number INT NOT NULL,
  total_labels INT DEFAULT 0,
  successful_labels INT DEFAULT 0,
  failed_labels INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_by TEXT, -- Clerk user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_print_batches_org ON print_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_print_batches_created ON print_batches(organization_id, created_at DESC);

-- =============================================
-- 2. Activity Log Table
-- =============================================
-- General activity tracking for shipments and operations

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_subscriber ON activity_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(organization_id, event_type);

-- =============================================
-- 3. Products Table
-- =============================================
-- Product catalog for the organization

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  sequence_id INT, -- For subscription boxes: which episode/box number
  product_type TEXT, -- 'subscription', 'one-off', 'add-on'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_shopify ON products(organization_id, shopify_product_id);

-- =============================================
-- 4. Users Table (for Clerk user sync)
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. Organization Memberships Table
-- =============================================

CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);

-- =============================================
-- 6. Add Pack Mode columns to Shipments
-- =============================================

-- Flagging
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS flagged_by TEXT;

-- Batch & Sequence tracking
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS print_batch_id UUID REFERENCES print_batches(id) ON DELETE SET NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS print_sequence INT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS label_purchased_at TIMESTAMPTZ;

-- Pack tracking
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS packed_by TEXT;

-- Merge tracking
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES shipments(id) ON DELETE SET NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS merged_shipment_ids UUID[];

-- Gift note
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS gift_note TEXT;

-- Error tracking
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS error_log TEXT;

-- ShipStation integration
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipstation_order_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;

-- Indexes for pack mode queries
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_batch ON shipments(print_batch_id);
CREATE INDEX IF NOT EXISTS idx_shipments_subscriber ON shipments(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_shipments_packed_at ON shipments(organization_id, packed_at);

-- =============================================
-- 7. RLS Policies
-- =============================================

ALTER TABLE print_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  CREATE POLICY "print_batches_org_access" ON print_batches FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "activity_log_org_access" ON activity_log FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "products_org_access" ON products FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 8. Helper function for batch numbering
-- =============================================

CREATE OR REPLACE FUNCTION get_next_batch_number(org_id TEXT)
RETURNS INT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(batch_number), 0) + 1 INTO next_num
  FROM print_batches
  WHERE organization_id = org_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;
