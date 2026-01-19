-- Migration: Shipping Preferences for In-App Label Purchasing
-- Description: Adds default carrier, service, and warehouse preferences for ShipStation v2 integration

-- =============================================
-- 1. Add shipping preference columns to organization_settings
-- =============================================

-- Default carrier ID from ShipStation (e.g., 'se-123456' or 'stamps_com')
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS default_carrier_id TEXT;

-- Default service code (e.g., 'usps_priority_mail', 'ups_ground')
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS default_service_code TEXT;

-- Default package type code (e.g., 'package', 'flat_rate_envelope')
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS default_package_code TEXT DEFAULT 'package';

-- Ship-from warehouse ID from ShipStation
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_warehouse_id TEXT;

-- Ship-from address (stored locally for rate requests)
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_name TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_company TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_address1 TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_address2 TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_city TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_state TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_zip TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_country TEXT DEFAULT 'US';
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS ship_from_phone TEXT;

-- Label format preference (pdf, png, zpl)
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS label_format TEXT DEFAULT 'pdf';

-- Label size preference (4x6, letter)
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS label_size TEXT DEFAULT '4x6';

-- =============================================
-- 2. Add label-related columns to shipments
-- =============================================

-- Label URL from ShipStation (direct download link)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS label_url TEXT;

-- Shipping cost paid for the label
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2);

-- ShipStation shipment ID (for voiding labels)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipstation_shipment_id TEXT;

-- Rate ID used to purchase the label (for reference)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS rate_id TEXT;

-- =============================================
-- 3. Add combined label PDF URL to print_batches
-- =============================================

-- If label_pdf_url doesn't exist, add it (may already exist from earlier migration)
ALTER TABLE print_batches ADD COLUMN IF NOT EXISTS label_pdf_url TEXT;

-- Total shipping cost for the batch
ALTER TABLE print_batches ADD COLUMN IF NOT EXISTS total_shipping_cost DECIMAL(10,2);

-- =============================================
-- 4. Comments for documentation
-- =============================================

COMMENT ON COLUMN organization_settings.default_carrier_id IS 'Default ShipStation carrier ID for quick label purchases';
COMMENT ON COLUMN organization_settings.default_service_code IS 'Default shipping service code (e.g., usps_priority_mail)';
COMMENT ON COLUMN organization_settings.default_package_code IS 'Default package type (package, flat_rate_envelope, etc.)';
COMMENT ON COLUMN organization_settings.ship_from_warehouse_id IS 'ShipStation warehouse ID for ship-from address';
COMMENT ON COLUMN organization_settings.label_format IS 'Label file format: pdf, png, or zpl';
COMMENT ON COLUMN organization_settings.label_size IS 'Label dimensions: 4x6 or letter';

COMMENT ON COLUMN shipments.label_url IS 'Direct URL to download the shipping label';
COMMENT ON COLUMN shipments.shipping_cost IS 'Cost paid for the shipping label';
COMMENT ON COLUMN shipments.shipstation_shipment_id IS 'ShipStation shipment ID for label management';
COMMENT ON COLUMN shipments.rate_id IS 'ShipStation rate ID used to purchase the label';

COMMENT ON COLUMN print_batches.total_shipping_cost IS 'Total shipping cost for all labels in the batch';
