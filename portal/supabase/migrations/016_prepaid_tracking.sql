-- Migration: Prepaid Tracking
-- Description: Add fields to track prepaid subscriptions and remaining shipments

-- Add prepaid tracking columns to subscribers
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS prepaid_total INT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS orders_remaining INT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN DEFAULT FALSE;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS recharge_subscription_id TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Add index for finding prepaid customers with remaining orders
CREATE INDEX IF NOT EXISTS idx_subscribers_orders_remaining ON subscribers(organization_id, orders_remaining) WHERE orders_remaining > 0;

-- Add skip_count if not exists
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS skip_count INT DEFAULT 0;

-- Add migration_status for the audit tool
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS migration_status TEXT CHECK (migration_status IN ('pending', 'audited', 'flagged', 'resolved', 'skipped'));

-- Add current_product_sequence for tracking episode/box number from audit
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS current_product_sequence INT;

COMMENT ON COLUMN subscribers.prepaid_total IS 'Total number of shipments in prepaid order (e.g., 12 for yearly prepaid)';
COMMENT ON COLUMN subscribers.orders_remaining IS 'Number of shipments still to be delivered';
COMMENT ON COLUMN subscribers.is_prepaid IS 'Whether this is a prepaid subscription';
COMMENT ON COLUMN subscribers.cancelled_at IS 'When the subscription was cancelled (if applicable)';
