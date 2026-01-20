-- Migration: Add Shopify shop domain to organizations
-- This enables linking Shopify App Store installs to organizations

-- Add shopify_shop_domain column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS shopify_shop_domain TEXT;

-- Create unique index for shop domain lookups
-- A shop can only be linked to one organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_shopify_shop_domain 
ON organizations(shopify_shop_domain) 
WHERE shopify_shop_domain IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_shopify_domain_lookup 
ON organizations(shopify_shop_domain);

-- Add comment for documentation
COMMENT ON COLUMN organizations.shopify_shop_domain IS 
'The myshopify.com domain of the linked Shopify store (e.g., store-name.myshopify.com). Used for Shopify App Store installation flow.';
