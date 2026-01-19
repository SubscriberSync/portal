-- Migration: Subscriber Activity & Enhancements
-- Description: Add activity tracking and additional subscriber fields

-- Add missing fields to subscribers table
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS at_risk BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Create index for at_risk subscribers
CREATE INDEX IF NOT EXISTS idx_subscribers_at_risk 
ON subscribers(organization_id, at_risk) 
WHERE at_risk = TRUE;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_subscribers_status 
ON subscribers(organization_id, status);

-- Create index for search (email, name)
CREATE INDEX IF NOT EXISTS idx_subscribers_email 
ON subscribers(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_subscribers_name 
ON subscribers(organization_id, first_name, last_name);

-- Activity log table for recent activity feed
CREATE TABLE IF NOT EXISTS subscriber_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'subscribed', 'paused', 'cancelled', 'reactivated', 
    'skipped', 'address_updated', 'status_changed'
  )),
  previous_value TEXT,
  new_value TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_subscriber_activity_org 
ON subscriber_activity(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriber_activity_subscriber 
ON subscriber_activity(subscriber_id, created_at DESC);

-- Enable RLS
ALTER TABLE subscriber_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DO $$ 
BEGIN
  CREATE POLICY "subscriber_activity_org_access" ON subscriber_activity FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Function to get subscriber stats
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
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id)::BIGINT AS total,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND status = 'Active')::BIGINT AS active,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND status = 'Paused')::BIGINT AS paused,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND status = 'Cancelled')::BIGINT AS cancelled,
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND at_risk = TRUE AND status = 'Active')::BIGINT AS at_risk_count,
    (SELECT COUNT(*) FROM subscribers 
     WHERE organization_id = org_id 
     AND created_at >= date_trunc('month', CURRENT_DATE))::BIGINT AS new_this_month,
    (SELECT COUNT(*) FROM subscribers 
     WHERE organization_id = org_id 
     AND status = 'Cancelled' 
     AND updated_at >= date_trunc('month', CURRENT_DATE))::BIGINT AS churned_this_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE subscriber_activity IS 'Tracks subscriber status changes and actions for activity feed';
COMMENT ON COLUMN subscribers.at_risk IS 'Flag for subscribers at risk of churning';
COMMENT ON COLUMN subscribers.tags IS 'Array of tags assigned to subscriber';
COMMENT ON COLUMN subscribers.discord_username IS 'Discord username if connected';
