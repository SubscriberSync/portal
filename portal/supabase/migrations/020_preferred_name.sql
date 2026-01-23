-- Migration: Add Preferred Name for Shipping
-- Description: Add preferred_name field and toggle to use it for shipping labels
-- This allows subscribers to specify a different first name for shipping purposes

-- Add preferred_name column to subscribers table
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Add use_preferred_name_for_shipping column to subscribers table
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS use_preferred_name_for_shipping BOOLEAN DEFAULT false;

-- Add comment explaining the columns
COMMENT ON COLUMN subscribers.preferred_name IS 'Optional preferred first name that can be used instead of first_name';
COMMENT ON COLUMN subscribers.use_preferred_name_for_shipping IS 'When true, preferred_name will be used as the first name on shipping labels';

-- Create index for querying subscribers with preferred names
CREATE INDEX IF NOT EXISTS idx_subscribers_preferred_name 
ON subscribers(organization_id, preferred_name) 
WHERE preferred_name IS NOT NULL;
