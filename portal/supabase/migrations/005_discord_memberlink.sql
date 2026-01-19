-- MemberLink Discord Integration Schema
-- Purpose: Enable Discord community integration with subscription management

-- =============================================
-- 1. Discord Guild Connections (per organization)
-- =============================================
-- Stores the connection between a SubscriptionSync organization and their Discord server

CREATE TABLE IF NOT EXISTS discord_guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  guild_name TEXT,
  guild_icon TEXT,
  bot_permissions TEXT,
  -- What happens when a subscriber cancels
  on_cancel_behavior TEXT DEFAULT 'remove_roles' 
    CHECK (on_cancel_behavior IN ('remove_roles', 'kick')),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by TEXT, -- Clerk user ID who connected
  UNIQUE(organization_id)
);

-- =============================================
-- 2. Role Mappings (subscription tier -> Discord role)
-- =============================================
-- Maps subscription tiers/products to Discord roles

CREATE TABLE IF NOT EXISTS discord_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  discord_guild_id UUID REFERENCES discord_guilds(id) ON DELETE CASCADE,
  -- The subscription tier identifier (e.g., "monthly", "quarterly", "vip", or product SKU)
  subscription_tier TEXT NOT NULL,
  -- Discord role info
  discord_role_id TEXT NOT NULL,
  discord_role_name TEXT,
  discord_role_color INT, -- Discord role color as integer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate mappings for the same tier
  UNIQUE(organization_id, subscription_tier)
);

-- =============================================
-- 3. Customer Discord Connections
-- =============================================
-- Links subscribers to their Discord accounts

CREATE TABLE IF NOT EXISTS customer_discord_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  -- Discord user info
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  discord_discriminator TEXT, -- Legacy, but still useful
  discord_avatar TEXT,
  discord_email TEXT, -- Email from Discord OAuth (if provided)
  -- OAuth tokens (encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  -- Connection status
  is_in_guild BOOLEAN DEFAULT FALSE,
  current_roles TEXT[] DEFAULT '{}', -- Array of role IDs currently assigned
  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_role_sync_at TIMESTAMPTZ,
  last_error TEXT, -- Store last error for debugging
  -- Each subscriber can only have one Discord connection per org
  UNIQUE(organization_id, subscriber_id),
  -- Each Discord user can only be connected once per org
  UNIQUE(organization_id, discord_user_id)
);

-- =============================================
-- 4. Discord Activity Log
-- =============================================
-- Audit trail for Discord operations

CREATE TABLE IF NOT EXISTS discord_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  discord_user_id TEXT,
  -- Action details
  action TEXT NOT NULL CHECK (action IN (
    'member_added', 'member_kicked', 'member_left',
    'role_added', 'role_removed', 'roles_synced',
    'connection_created', 'connection_revoked',
    'token_refreshed', 'sync_error'
  )),
  details JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_discord_guilds_org ON discord_guilds(organization_id);
CREATE INDEX IF NOT EXISTS idx_discord_guilds_guild_id ON discord_guilds(guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_org ON discord_role_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_guild ON discord_role_mappings(discord_guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_tier ON discord_role_mappings(organization_id, subscription_tier);

CREATE INDEX IF NOT EXISTS idx_customer_discord_org ON customer_discord_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_discord_subscriber ON customer_discord_connections(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_customer_discord_user ON customer_discord_connections(organization_id, discord_user_id);

CREATE INDEX IF NOT EXISTS idx_discord_activity_org ON discord_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_discord_activity_subscriber ON discord_activity_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_discord_activity_time ON discord_activity_log(organization_id, created_at DESC);

-- =============================================
-- 6. Row Level Security
-- =============================================

ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_discord_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies using org_id from JWT
CREATE POLICY "discord_guilds_org_access" ON discord_guilds FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "discord_role_mappings_org_access" ON discord_role_mappings FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "customer_discord_org_access" ON customer_discord_connections FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "discord_activity_org_access" ON discord_activity_log FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

-- =============================================
-- 7. Helper Functions
-- =============================================

-- Function to get Discord connection stats for an organization
CREATE OR REPLACE FUNCTION get_discord_stats(org_id TEXT)
RETURNS TABLE (
  total_subscribers BIGINT,
  connected_subscribers BIGINT,
  in_guild_count BIGINT,
  connection_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND status = 'Active')::BIGINT AS total_subscribers,
    (SELECT COUNT(*) FROM customer_discord_connections WHERE organization_id = org_id)::BIGINT AS connected_subscribers,
    (SELECT COUNT(*) FROM customer_discord_connections WHERE organization_id = org_id AND is_in_guild = TRUE)::BIGINT AS in_guild_count,
    CASE
      WHEN (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND status = 'Active') = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM customer_discord_connections WHERE organization_id = org_id)::NUMERIC /
        (SELECT COUNT(*) FROM subscribers WHERE organization_id = org_id AND status = 'Active')::NUMERIC * 100,
        1
      )
    END AS connection_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
