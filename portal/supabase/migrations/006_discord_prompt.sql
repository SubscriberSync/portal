-- Migration: Discord Prompt Dismissal State
-- Description: Add fields to track optional Discord setup prompt dismissal

-- Add columns to organizations table for Discord prompt state
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS discord_prompt_dismissed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discord_prompt_remind_at TIMESTAMPTZ;

-- Index for efficient querying of remind timestamps
CREATE INDEX IF NOT EXISTS idx_organizations_discord_remind 
ON organizations(discord_prompt_remind_at) 
WHERE discord_prompt_remind_at IS NOT NULL;

COMMENT ON COLUMN organizations.discord_prompt_dismissed IS 'If true, Discord setup prompt is permanently dismissed (available in Settings)';
COMMENT ON COLUMN organizations.discord_prompt_remind_at IS 'If set, show Discord prompt again after this timestamp';
