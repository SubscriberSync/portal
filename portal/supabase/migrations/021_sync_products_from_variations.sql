-- Migration: Sync Products from Product Variations
-- Description: Links products table to product_variations and syncs existing data
-- This ensures the Products tab displays data from onboarding and enables proper SKU mapping

-- =============================================
-- 1. Add Foreign Key to Products Table
-- =============================================
-- Link products to product_variations for data synchronization
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_variation_id UUID REFERENCES product_variations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_variation ON products(product_variation_id);

-- =============================================
-- 2. Sync Existing Product Variations to Products
-- =============================================
-- Populate products table from product_variations where they've been assigned to stories
-- This is a one-time sync for existing data
-- Use ON CONFLICT to update existing products instead of inserting duplicates

INSERT INTO products (
  organization_id,
  name,
  sku,
  type,
  box_number,
  product_variation_id,
  created_at
)
SELECT DISTINCT ON (pv.organization_id, COALESCE(pv.sku, pv.product_name))
  pv.organization_id,
  pv.product_name as name,
  pv.sku,
  CASE 
    WHEN pv.variation_type = 'subscription' THEN 'Main Box'
    WHEN pv.variation_type = 'addon' THEN 'Add-On'
    ELSE NULL
  END as type,
  NULL as box_number,  -- Will be set based on tier/story mapping in future
  pv.id as product_variation_id,
  pv.created_at
FROM product_variations pv
WHERE 
  pv.story_id IS NOT NULL 
  AND pv.variation_type = 'subscription'
ORDER BY pv.organization_id, COALESCE(pv.sku, pv.product_name), pv.created_at
ON CONFLICT (organization_id, sku) 
DO UPDATE SET
  product_variation_id = EXCLUDED.product_variation_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type
WHERE products.product_variation_id IS NULL;

-- =============================================
-- 3. Add Helper Function for Future Syncing
-- =============================================
-- This function will be called when product_variations are assigned to stories
-- to automatically create corresponding products entries

CREATE OR REPLACE FUNCTION sync_product_variation_to_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync when a variation is assigned to a story and is a subscription type
  IF NEW.story_id IS NOT NULL AND NEW.variation_type = 'subscription' THEN
    -- Insert or update the corresponding product
    INSERT INTO products (
      organization_id,
      name,
      sku,
      type,
      product_variation_id,
      created_at
    )
    VALUES (
      NEW.organization_id,
      NEW.product_name,
      NEW.sku,
      'Main Box',
      NEW.id,
      NOW()
    )
    ON CONFLICT (organization_id, sku)
    DO UPDATE SET
      product_variation_id = NEW.id,
      type = 'Main Box'
    WHERE products.product_variation_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync when variations are assigned
DROP TRIGGER IF EXISTS sync_variation_to_product ON product_variations;
CREATE TRIGGER sync_variation_to_product
  AFTER INSERT OR UPDATE ON product_variations
  FOR EACH ROW
  WHEN (NEW.story_id IS NOT NULL AND NEW.variation_type = 'subscription')
  EXECUTE FUNCTION sync_product_variation_to_products();

-- =============================================
-- 4. Note on Existing Constraints
-- =============================================
-- The products table already has a unique constraint on (organization_id, sku)
-- No additional constraint needed

-- =============================================
-- 5. Update Existing Products with Variation Links
-- =============================================
-- For any existing products without variation links, try to match them

UPDATE products p
SET product_variation_id = pv.id
FROM product_variations pv
WHERE p.product_variation_id IS NULL
  AND p.organization_id = pv.organization_id
  AND p.name = pv.product_name
  AND COALESCE(p.sku, '') = COALESCE(pv.sku, '')
  AND pv.story_id IS NOT NULL
  AND pv.variation_type = 'subscription';

-- =============================================
-- Comments for Documentation
-- =============================================
COMMENT ON COLUMN products.product_variation_id IS 'Links to the product_variation from onboarding/story assignment';
COMMENT ON FUNCTION sync_product_variation_to_products IS 'Automatically syncs product_variations to products table when assigned to stories';
