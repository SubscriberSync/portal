-- Migration: Shipping Provider Preference
-- Description: Add shipping provider selection field to organizations

-- Add column to organizations table for shipping provider preference
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(20);
-- Valid values: 'shipstation', 'pirateship', 'shopify_shipping', NULL (not selected)

COMMENT ON COLUMN organizations.shipping_provider IS 'Selected shipping provider: shipstation (recommended), pirateship (CSV export), shopify_shipping (not recommended), or NULL (not yet selected)';
