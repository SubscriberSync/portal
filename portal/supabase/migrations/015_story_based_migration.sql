-- Story-Based Migration System
-- Redesigns the migration to be customer-centric (email-based) rather than SKU-based

-- 1. Stories table - defines subscription stories/products
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                              -- "Echoes of the Crucible"
  slug TEXT NOT NULL,                              -- "eotc"
  story_type TEXT NOT NULL DEFAULT 'sequential'   -- 'sequential' (ends after N) | 'recurring' (forever)
    CHECK (story_type IN ('sequential', 'recurring')),
  total_episodes INT,                              -- 12 for sequential, NULL for recurring
  installment_name TEXT DEFAULT 'Episode',         -- What to call each installment: "Episode", "Box", "Issue"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Story tiers - variants within a story (Ritual, Vault, Digital)
CREATE TABLE IF NOT EXISTS story_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                              -- "Ritual", "Vault", "Digital"
  description TEXT,
  price_hint TEXT,                                 -- "$49.95/mo" for display purposes
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, name)
);

-- 3. Product variations - all the messy product names from Shopify
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,

  -- Raw data from Shopify
  shopify_product_id BIGINT,
  shopify_variant_id BIGINT,
  product_name TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,

  -- User assignment
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  tier_id UUID REFERENCES story_tiers(id) ON DELETE SET NULL,

  -- Counts for UI display
  order_count INT DEFAULT 0,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,

  -- Classification
  variation_type TEXT DEFAULT 'subscription'      -- 'subscription' | 'addon' | 'ignored'
    CHECK (variation_type IN ('subscription', 'addon', 'ignored')),

  -- Sample data for display
  sample_order_numbers INT[],
  sample_properties JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index for product variations (handles NULL values with COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variations_unique
  ON product_variations(organization_id, product_name, COALESCE(variant_title, ''), COALESCE(sku, ''));

-- 4. Customer story progress - THE source of truth for where each customer is
CREATE TABLE IF NOT EXISTS customer_story_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,

  -- Customer identity (email is the primary key conceptually)
  customer_email TEXT NOT NULL,
  customer_name TEXT,                              -- For display
  shopify_customer_ids TEXT[] DEFAULT '{}',       -- May have multiple over time
  recharge_customer_ids TEXT[] DEFAULT '{}',

  -- Story progress
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  current_episode INT NOT NULL DEFAULT 0,         -- Last received episode (0 = hasn't received any)
  current_tier_id UUID REFERENCES story_tiers(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'active'                    -- 'active' | 'paused' | 'completed' | 'churned'
    CHECK (status IN ('active', 'paused', 'completed', 'churned')),

  -- Audit trail - array of episode deliveries
  episode_history JSONB DEFAULT '[]',             -- [{episode: 1, date: '...', order_id: '...', tier_name: 'Ritual', product_name: '...'}, ...]

  -- Flags for review
  needs_review BOOLEAN DEFAULT FALSE,
  review_reasons TEXT[] DEFAULT '{}',             -- ['tier_change', 'gap_detected', 'multiple_subs']

  -- Manual overrides
  manually_adjusted BOOLEAN DEFAULT FALSE,
  adjusted_by TEXT,                               -- Clerk user ID
  adjusted_at TIMESTAMPTZ,
  adjustment_note TEXT,

  -- Link to existing subscriber record (for backwards compatibility)
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, customer_email, story_id)
);

-- 5. Add story reference to organizations for default story
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS default_story_id UUID REFERENCES stories(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_org ON stories(organization_id);
CREATE INDEX IF NOT EXISTS idx_story_tiers_story ON story_tiers(story_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_org ON product_variations(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_story ON product_variations(story_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_unassigned ON product_variations(organization_id)
  WHERE story_id IS NULL AND variation_type = 'subscription';
CREATE INDEX IF NOT EXISTS idx_customer_progress_org ON customer_story_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_progress_email ON customer_story_progress(organization_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_progress_story ON customer_story_progress(story_id);
CREATE INDEX IF NOT EXISTS idx_customer_progress_review ON customer_story_progress(organization_id, needs_review)
  WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_progress_status ON customer_story_progress(organization_id, status);

-- RLS Policies
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_story_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_org_access" ON stories FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "story_tiers_org_access" ON story_tiers FOR ALL
  USING (story_id IN (SELECT id FROM stories WHERE organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id')));

CREATE POLICY "product_variations_org_access" ON product_variations FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

CREATE POLICY "customer_progress_org_access" ON customer_story_progress FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

-- Function to get migration step completion status
CREATE OR REPLACE FUNCTION get_migration_status(org_id TEXT)
RETURNS TABLE (
  has_stories BOOLEAN,
  has_product_variations BOOLEAN,
  unassigned_variations BIGINT,
  assigned_variations BIGINT,
  total_customers BIGINT,
  customers_needing_review BIGINT,
  migration_complete BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM stories WHERE organization_id = org_id) as has_stories,
    EXISTS(SELECT 1 FROM product_variations WHERE organization_id = org_id) as has_product_variations,
    (SELECT COUNT(*) FROM product_variations
      WHERE organization_id = org_id AND story_id IS NULL AND variation_type = 'subscription')::BIGINT as unassigned_variations,
    (SELECT COUNT(*) FROM product_variations
      WHERE organization_id = org_id AND story_id IS NOT NULL)::BIGINT as assigned_variations,
    (SELECT COUNT(*) FROM customer_story_progress WHERE organization_id = org_id)::BIGINT as total_customers,
    (SELECT COUNT(*) FROM customer_story_progress
      WHERE organization_id = org_id AND needs_review = TRUE)::BIGINT as customers_needing_review,
    COALESCE((SELECT o.migration_complete FROM organizations o WHERE o.id = org_id), FALSE) as migration_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE stories IS 'Subscription stories/products that have sequential or recurring episodes';
COMMENT ON TABLE story_tiers IS 'Pricing/content tiers within a story (e.g., Ritual, Vault, Digital)';
COMMENT ON TABLE product_variations IS 'All unique product name/SKU/variant combinations from Shopify order history';
COMMENT ON TABLE customer_story_progress IS 'Source of truth for each customer''s progress through each story';
COMMENT ON COLUMN customer_story_progress.current_episode IS 'The last episode the customer received (0 = none yet, 1 = received first episode)';
COMMENT ON COLUMN customer_story_progress.episode_history IS 'Array of all episode deliveries with dates and order details';
