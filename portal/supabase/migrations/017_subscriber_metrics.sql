-- Migration: Add subscriber metrics function for metrics hub
-- Description: Creates get_subscriber_metrics function for episode/tenure distribution analytics

-- =============================================
-- 1. Create get_subscriber_metrics function
-- =============================================

CREATE OR REPLACE FUNCTION get_subscriber_metrics(
  p_org_id TEXT,
  p_sku TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'Active'),
    'paused', COUNT(*) FILTER (WHERE status = 'Paused'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'Cancelled'),
    'expired', COUNT(*) FILTER (WHERE status = 'Expired'),
    'at_risk', COUNT(*) FILTER (WHERE at_risk = true AND status = 'Active'),
    'new_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())),
    'churned_this_month', COUNT(*) FILTER (WHERE status = 'Cancelled' AND updated_at >= date_trunc('month', NOW())),
    'by_episode', (
      SELECT COALESCE(json_agg(json_build_object('episode', box_number, 'count', cnt) ORDER BY box_number), '[]'::json)
      FROM (
        SELECT box_number, COUNT(*) as cnt
        FROM subscribers s2
        WHERE s2.organization_id = p_org_id
          AND s2.status = 'Active'
          AND (p_sku IS NULL OR s2.sku = p_sku)
        GROUP BY box_number
        ORDER BY box_number
      ) ep
    ),
    'by_tenure', (
      SELECT COALESCE(json_agg(json_build_object('months', tenure_months, 'count', cnt) ORDER BY tenure_months), '[]'::json)
      FROM (
        SELECT
          CASE
            WHEN subscribed_at IS NULL THEN 1
            WHEN EXTRACT(MONTH FROM AGE(NOW(), subscribed_at)) +
                 (EXTRACT(YEAR FROM AGE(NOW(), subscribed_at)) * 12) < 1 THEN 1
            WHEN EXTRACT(MONTH FROM AGE(NOW(), subscribed_at)) +
                 (EXTRACT(YEAR FROM AGE(NOW(), subscribed_at)) * 12) < 3 THEN 3
            WHEN EXTRACT(MONTH FROM AGE(NOW(), subscribed_at)) +
                 (EXTRACT(YEAR FROM AGE(NOW(), subscribed_at)) * 12) < 6 THEN 6
            WHEN EXTRACT(MONTH FROM AGE(NOW(), subscribed_at)) +
                 (EXTRACT(YEAR FROM AGE(NOW(), subscribed_at)) * 12) < 12 THEN 12
            WHEN EXTRACT(MONTH FROM AGE(NOW(), subscribed_at)) +
                 (EXTRACT(YEAR FROM AGE(NOW(), subscribed_at)) * 12) < 18 THEN 18
            ELSE 24
          END as tenure_months,
          COUNT(*) as cnt
        FROM subscribers s3
        WHERE s3.organization_id = p_org_id
          AND s3.status = 'Active'
          AND (p_sku IS NULL OR s3.sku = p_sku)
        GROUP BY tenure_months
        ORDER BY tenure_months
      ) ten
    ),
    'products', (
      SELECT COALESCE(json_agg(DISTINCT s4.sku ORDER BY s4.sku), '[]'::json)
      FROM subscribers s4
      WHERE s4.organization_id = p_org_id
        AND s4.sku IS NOT NULL
    )
  ) INTO result
  FROM subscribers
  WHERE organization_id = p_org_id
    AND (p_sku IS NULL OR sku = p_sku);

  -- Handle case where no subscribers exist
  IF result IS NULL THEN
    result := json_build_object(
      'total', 0,
      'active', 0,
      'paused', 0,
      'cancelled', 0,
      'expired', 0,
      'at_risk', 0,
      'new_this_month', 0,
      'churned_this_month', 0,
      'by_episode', '[]'::json,
      'by_tenure', '[]'::json,
      'products', '[]'::json
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. Add index for SKU filtering (if not exists)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_subscribers_sku ON subscribers(organization_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_box_number ON subscribers(organization_id, box_number);
