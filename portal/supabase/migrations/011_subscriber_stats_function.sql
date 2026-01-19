-- Migration: Add subscriber stats function and missing columns
-- Description: Adds the get_subscriber_stats function and missing subscriber columns

-- =============================================
-- 1. Add missing columns to subscribers table
-- =============================================

-- at_risk flag for churn prediction
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS at_risk BOOLEAN DEFAULT FALSE;

-- subscribed_at for tracking when they first subscribed
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ;

-- sku for the product they're subscribed to
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS sku TEXT;

-- frequency of their subscription
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('Monthly', 'Quarterly', 'Yearly'));

-- next_charge_date for predictive merging (if not already added)
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS next_charge_date TIMESTAMPTZ;

-- tags array for custom tagging
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- discord_username for Discord integration
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- =============================================
-- 2. Create get_subscriber_stats function
-- =============================================

CREATE OR REPLACE FUNCTION get_subscriber_stats(org_id TEXT)
RETURNS TABLE (
  total BIGINT,
  active BIGINT,
  paused BIGINT,
  cancelled BIGINT,
  at_risk_count BIGINT,
  new_this_month BIGINT,
  churned_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE status = 'Active')::BIGINT as active,
    COUNT(*) FILTER (WHERE status = 'Paused')::BIGINT as paused,
    COUNT(*) FILTER (WHERE status = 'Cancelled')::BIGINT as cancelled,
    COUNT(*) FILTER (WHERE subscribers.at_risk = true)::BIGINT as at_risk_count,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::BIGINT as new_this_month,
    COUNT(*) FILTER (WHERE status = 'Cancelled' AND updated_at >= date_trunc('month', NOW()))::BIGINT as churned_this_month
  FROM subscribers
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. Add indexes for new columns
-- =============================================

CREATE INDEX IF NOT EXISTS idx_subscribers_at_risk ON subscribers(organization_id, at_risk) WHERE at_risk = true;
CREATE INDEX IF NOT EXISTS idx_subscribers_next_charge ON subscribers(organization_id, next_charge_date);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed_at ON subscribers(organization_id, subscribed_at);
