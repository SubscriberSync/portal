-- Migration: Subscriber Compound Key
-- Description: Change subscribers unique constraint to compound key (org_id, subscription_id, email)
-- This allows a subscriber with multiple concurrent subscriptions to be tracked as separate accounts

-- =============================================
-- 1. Drop the existing unique constraint
-- =============================================

-- Drop the index that was created for the old unique constraint
DROP INDEX IF EXISTS idx_subscribers_email;

-- Drop the old unique constraint
-- The constraint name in PostgreSQL for UNIQUE(organization_id, email) is typically:
-- subscribers_organization_id_email_key
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_organization_id_email_key;

-- =============================================
-- 2. Create new compound unique constraint
-- =============================================

-- Main unique constraint for subscribers WITH a subscription ID
-- This allows: same email with different subscription IDs = different subscriber records
ALTER TABLE subscribers 
ADD CONSTRAINT subscribers_org_subscription_email_key 
UNIQUE (organization_id, recharge_subscription_id, email);

-- =============================================
-- 3. Handle NULL subscription IDs (one-time orders)
-- =============================================

-- Partial unique index for when subscription_id is NULL
-- This prevents duplicate emails WITHOUT a subscription ID
-- Allows one-time order customers to exist and be tracked
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_org_email_no_subscription 
ON subscribers (organization_id, email) 
WHERE recharge_subscription_id IS NULL;

-- =============================================
-- 4. Add indexes for common query patterns
-- =============================================

-- Index for looking up by org + email (common lookup pattern)
CREATE INDEX IF NOT EXISTS idx_subscribers_org_email 
ON subscribers (organization_id, email);

-- Index for looking up by org + subscription_id
CREATE INDEX IF NOT EXISTS idx_subscribers_org_subscription 
ON subscribers (organization_id, recharge_subscription_id) 
WHERE recharge_subscription_id IS NOT NULL;

-- =============================================
-- 5. Documentation
-- =============================================

COMMENT ON CONSTRAINT subscribers_org_subscription_email_key ON subscribers IS 
'Compound unique key: allows same email with different subscription IDs to be tracked as separate subscriber records';

COMMENT ON INDEX idx_subscribers_org_email_no_subscription IS 
'Partial unique index: prevents duplicate emails when no subscription ID is present (one-time orders)';
