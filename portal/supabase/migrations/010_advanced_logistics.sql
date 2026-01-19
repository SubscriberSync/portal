-- Migration: Advanced Logistics Features
-- Description: Adds Ghost Order handling and Predictive Merging support

-- =============================================
-- 1. Add on_hold status to shipments
-- =============================================
-- Note: Since Postgres doesn't support altering CHECK constraints easily,
-- we need to drop and recreate, or just add the column without strict checking
-- The application will handle validation

-- Add external_fulfillment_source to track labels bought outside system
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS external_fulfillment_source TEXT;
-- Values: 'shipstation_direct', 'pirateship_csv', 'shopify_shipping', 'subscribersync', null

COMMENT ON COLUMN shipments.external_fulfillment_source IS 
  'Source of shipping label: shipstation_direct, pirateship_csv, shopify_shipping, subscribersync, or null for internal';

-- =============================================
-- 2. Add next_charge_date to subscribers
-- =============================================
-- Critical for predictive merging - knowing when the next subscription renewal is
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS next_charge_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscribers_next_charge 
ON subscribers(organization_id, next_charge_date) 
WHERE next_charge_date IS NOT NULL;

COMMENT ON COLUMN subscribers.next_charge_date IS 
  'Next scheduled subscription charge date from Recharge, used for predictive merging';

-- =============================================
-- 3. Create organization_settings table
-- =============================================
CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  -- Predictive merging: how many days before renewal to hold one-off orders
  smart_hold_days INT DEFAULT 7,
  -- Auto-merge: automatically merge held orders when renewal comes in
  auto_merge_enabled BOOLEAN DEFAULT TRUE,
  -- Ghost order handling: update status when external fulfillment detected
  ghost_order_handling BOOLEAN DEFAULT TRUE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  CREATE POLICY "org_settings_access" ON organization_settings FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE organization_settings IS 'Per-organization settings for advanced logistics features';
COMMENT ON COLUMN organization_settings.smart_hold_days IS 'Days before renewal to hold one-off orders for potential merging (default 7)';
COMMENT ON COLUMN organization_settings.auto_merge_enabled IS 'Automatically merge held orders when subscription renewal comes in';
COMMENT ON COLUMN organization_settings.ghost_order_handling IS 'Update shipment status when labels are bought outside the system';

-- =============================================
-- 4. Add held_until field for on-hold tracking
-- =============================================
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS held_until TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS hold_reason TEXT;

COMMENT ON COLUMN shipments.held_until IS 'If on hold, the date of the expected subscription renewal';
COMMENT ON COLUMN shipments.hold_reason IS 'Reason for hold: predictive_merge, manual, etc.';

-- =============================================
-- 5. Create function to get organization settings with defaults
-- =============================================
CREATE OR REPLACE FUNCTION get_organization_settings(org_id TEXT)
RETURNS TABLE (
  smart_hold_days INT,
  auto_merge_enabled BOOLEAN,
  ghost_order_handling BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.smart_hold_days, 7),
    COALESCE(s.auto_merge_enabled, TRUE),
    COALESCE(s.ghost_order_handling, TRUE)
  FROM (SELECT 1) AS dummy
  LEFT JOIN organization_settings s ON s.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Index for finding held shipments
-- =============================================
CREATE INDEX IF NOT EXISTS idx_shipments_held 
ON shipments(organization_id, held_until) 
WHERE held_until IS NOT NULL AND status = 'Unfulfilled';
