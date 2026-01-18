-- Migration: Add Stripe subscription fields
-- Description: Adds subscription tracking to organizations and creates pending_checkouts table

-- =============================================
-- 1. Add subscription columns to organizations
-- =============================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS failed_payment_count INT DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_test_portal BOOLEAN DEFAULT FALSE;

-- Indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription ON organizations(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

-- =============================================
-- 2. Create pending_checkouts table
-- =============================================
-- Stores checkout session data before Clerk organization exists

CREATE TABLE IF NOT EXISTS pending_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe reference
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Customer info from checkout
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  company_name TEXT NOT NULL,

  -- Generated organization details
  organization_slug TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'failed')),

  -- Invitation tracking
  clerk_organization_id TEXT,
  clerk_invitation_id TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,

  -- Link to created organization (after Clerk org is created)
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_email ON pending_checkouts(customer_email);
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_session ON pending_checkouts(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_status ON pending_checkouts(status);
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_slug ON pending_checkouts(organization_slug);

-- =============================================
-- 3. Create subscription_events table (audit log)
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,

  -- Event details
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,

  -- Processing status
  processed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org ON subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_id ON subscription_events(stripe_event_id);

-- =============================================
-- 4. RLS Policies
-- =============================================

ALTER TABLE pending_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- pending_checkouts: Only service role should access (no user access needed)
-- No RLS policy = service role only

-- subscription_events: Users can view their org's events
CREATE POLICY "org_access" ON subscription_events
  FOR SELECT
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

-- Service role bypass for both tables (implicit with service key)
