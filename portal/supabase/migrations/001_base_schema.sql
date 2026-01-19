-- Migration: Base Schema
-- Description: Core tables for SubscriberSync Portal
-- Run this FIRST before any other migrations

-- =============================================
-- 1. Organizations Table
-- =============================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, -- Clerk organization ID
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  status TEXT DEFAULT 'Building' CHECK (status IN ('Discovery', 'Scoping', 'Building', 'Testing', 'Training', 'Live')),
  -- Onboarding progress
  step1_complete BOOLEAN DEFAULT FALSE,
  step2_complete BOOLEAN DEFAULT FALSE,
  -- Links
  loom_url TEXT,
  hosting_renewal TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- =============================================
-- 2. Integrations Table
-- =============================================
-- Stores OAuth tokens and API credentials for each integration

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shopify', 'recharge', 'klaviyo', 'discord', 'shipstation')),
  connected BOOLEAN DEFAULT FALSE,
  -- Credentials (encrypted in production)
  credentials_encrypted JSONB,
  -- OAuth state
  oauth_state TEXT,
  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One integration per type per org
  UNIQUE(organization_id, type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(organization_id, type);

-- =============================================
-- 3. Subscribers Table
-- =============================================

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  -- Contact info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  -- Address
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  -- Subscription info
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Cancelled', 'Expired')),
  box_number INT DEFAULT 1,
  shirt_size TEXT,
  -- External IDs
  recharge_customer_id TEXT,
  shopify_customer_id TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique email per org
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_org ON subscribers(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_subscribers_recharge ON subscribers(organization_id, recharge_customer_id);

-- =============================================
-- 4. Shipments Table
-- =============================================

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  -- Type and identification
  type TEXT CHECK (type IN ('Subscription', 'One-Off')),
  sequence_id INT, -- Box/episode number for subscriptions
  product_name TEXT,
  -- Status flow: Unfulfilled -> Ready to Pack -> Packed -> Shipped -> Delivered
  status TEXT DEFAULT 'Unfulfilled' CHECK (status IN (
    'Unfulfilled', 'Ready to Pack', 'Packed', 'Flagged', 'Merged', 'Shipped', 'Delivered'
  )),
  -- Shipping details
  carrier TEXT,
  tracking_number TEXT,
  -- Timestamps
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipments_subscriber ON shipments(subscriber_id);

-- =============================================
-- 5. Intake Submissions Table
-- =============================================
-- Client onboarding intake form submissions

CREATE TABLE IF NOT EXISTS intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'shopify_url', 'recharge_api_key', etc.
  value_encrypted TEXT, -- Encrypted credential value
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Submitted', 'Approved', 'Rejected')),
  rejection_note TEXT,
  help_video_url TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_org ON intake_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_submissions(organization_id, status);

-- =============================================
-- 6. Discord Configs Table (Simple config storage)
-- =============================================

CREATE TABLE IF NOT EXISTS discord_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  decision TEXT DEFAULT 'Not Decided' CHECK (decision IN ('Not Decided', 'Yes Setup', 'Maybe Later', 'No Thanks')),
  new_or_existing TEXT CHECK (new_or_existing IN ('Create New', 'Connect Existing')),
  server_name TEXT,
  server_id TEXT,
  channels TEXT[], -- Array of channel types
  episode_gated BOOLEAN DEFAULT FALSE,
  moderator_name TEXT,
  moderator_email TEXT,
  vibe TEXT CHECK (vibe IN ('Casual & Friendly', 'Professional', 'Playful & Fun')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_configs_org ON discord_configs(organization_id);

-- =============================================
-- 7. Enable RLS on all tables
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_configs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. RLS Policies
-- =============================================

-- Organizations: Users can only access their own org
DO $$ 
BEGIN
  CREATE POLICY "organizations_access" ON organizations FOR ALL
    USING (id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- All other tables: Access based on organization_id matching JWT org_id
DO $$ 
BEGIN
  CREATE POLICY "integrations_org_access" ON integrations FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "subscribers_org_access" ON subscribers FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "shipments_org_access" ON shipments FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "intake_org_access" ON intake_submissions FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "discord_configs_org_access" ON discord_configs FOR ALL
    USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
