-- Migration: Admin Subscriber Management
-- Description: Add admin capabilities for subscriber management including merge, delete, and full editing
-- This enables admin-like editing in both the Import Tool and Subscribers Tab

-- =============================================
-- 1. Add soft delete support
-- =============================================

-- Add deleted_at column to subscribers for soft delete
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to customer_story_progress for soft delete
ALTER TABLE customer_story_progress ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_subscribers_not_deleted 
ON subscribers (organization_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_progress_not_deleted 
ON customer_story_progress (organization_id) 
WHERE deleted_at IS NULL;

-- =============================================
-- 2. Admin audit log table
-- =============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('merge', 'delete', 'edit', 'create_order', 'restore', 'bulk_delete', 'bulk_merge')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('subscriber', 'customer_story_progress', 'shipment', 'order')),
  entity_id UUID,
  secondary_entity_id UUID, -- For merge operations, stores the source ID
  performed_by TEXT NOT NULL, -- Clerk user ID
  performed_by_email TEXT, -- Email for display
  details JSONB DEFAULT '{}', -- Flexible storage for operation details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying audit logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_org ON admin_audit_log (organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON admin_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log (organization_id, action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_date ON admin_audit_log (organization_id, created_at DESC);

-- RLS for admin audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log_org_access" ON admin_audit_log FOR ALL
  USING (organization_id = (current_setting('request.jwt.claims', true)::json->>'org_id'));

-- =============================================
-- 3. Merge subscribers function
-- =============================================

CREATE OR REPLACE FUNCTION merge_subscribers(
  p_source_id UUID,
  p_target_id UUID,
  p_org_id TEXT,
  p_performed_by TEXT,
  p_keep_source_address BOOLEAN DEFAULT FALSE,
  p_merge_shipments BOOLEAN DEFAULT TRUE,
  p_merge_episode_history BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_record subscribers%ROWTYPE;
  v_target_record subscribers%ROWTYPE;
  v_shipments_transferred INT := 0;
  v_progress_merged INT := 0;
  v_result JSONB;
BEGIN
  -- Validate both records exist and belong to the organization
  SELECT * INTO v_source_record 
  FROM subscribers 
  WHERE id = p_source_id AND organization_id = p_org_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source subscriber not found or already deleted';
  END IF;
  
  SELECT * INTO v_target_record 
  FROM subscribers 
  WHERE id = p_target_id AND organization_id = p_org_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target subscriber not found or already deleted';
  END IF;
  
  -- Cannot merge a subscriber with itself
  IF p_source_id = p_target_id THEN
    RAISE EXCEPTION 'Cannot merge a subscriber with itself';
  END IF;

  -- Transfer shipments from source to target
  IF p_merge_shipments THEN
    UPDATE shipments 
    SET subscriber_id = p_target_id,
        updated_at = NOW()
    WHERE subscriber_id = p_source_id 
      AND organization_id = p_org_id;
    
    GET DIAGNOSTICS v_shipments_transferred = ROW_COUNT;
  END IF;

  -- Update customer_story_progress to point to target subscriber
  UPDATE customer_story_progress
  SET subscriber_id = p_target_id,
      -- Merge shopify_customer_ids arrays
      shopify_customer_ids = ARRAY(
        SELECT DISTINCT unnest(
          COALESCE(shopify_customer_ids, '{}') || 
          COALESCE((SELECT shopify_customer_ids FROM customer_story_progress WHERE subscriber_id = p_source_id AND organization_id = p_org_id LIMIT 1), '{}')
        )
      ),
      -- Merge recharge_customer_ids arrays
      recharge_customer_ids = ARRAY(
        SELECT DISTINCT unnest(
          COALESCE(recharge_customer_ids, '{}') || 
          COALESCE((SELECT recharge_customer_ids FROM customer_story_progress WHERE subscriber_id = p_source_id AND organization_id = p_org_id LIMIT 1), '{}')
        )
      ),
      updated_at = NOW()
  WHERE subscriber_id = p_target_id 
    AND organization_id = p_org_id;

  -- Merge episode_history if requested
  IF p_merge_episode_history THEN
    UPDATE customer_story_progress
    SET episode_history = (
      SELECT jsonb_agg(DISTINCT elem ORDER BY (elem->>'date')::timestamptz ASC)
      FROM (
        SELECT jsonb_array_elements(COALESCE(
          (SELECT episode_history FROM customer_story_progress WHERE subscriber_id = p_target_id AND organization_id = p_org_id LIMIT 1),
          '[]'::jsonb
        )) AS elem
        UNION ALL
        SELECT jsonb_array_elements(COALESCE(
          (SELECT episode_history FROM customer_story_progress WHERE subscriber_id = p_source_id AND organization_id = p_org_id LIMIT 1),
          '[]'::jsonb
        )) AS elem
      ) combined
    )
    WHERE subscriber_id = p_target_id 
      AND organization_id = p_org_id;
  END IF;

  -- Count progress records that were updated
  SELECT COUNT(*) INTO v_progress_merged
  FROM customer_story_progress
  WHERE subscriber_id = p_target_id AND organization_id = p_org_id;

  -- Optionally copy address from source to target
  IF p_keep_source_address THEN
    UPDATE subscribers
    SET address1 = v_source_record.address1,
        address2 = v_source_record.address2,
        city = v_source_record.city,
        state = v_source_record.state,
        zip = v_source_record.zip,
        country = v_source_record.country,
        phone = v_source_record.phone,
        updated_at = NOW()
    WHERE id = p_target_id;
  END IF;

  -- Merge tags (combine unique tags)
  UPDATE subscribers
  SET tags = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(v_target_record.tags, '{}') || 
      COALESCE(v_source_record.tags, '{}')
    )
  ),
  -- Keep the earliest subscription date
  subscribed_at = LEAST(
    COALESCE(v_target_record.subscribed_at, v_source_record.subscribed_at),
    COALESCE(v_source_record.subscribed_at, v_target_record.subscribed_at)
  ),
  -- Combine external IDs if target doesn't have them
  shopify_customer_id = COALESCE(v_target_record.shopify_customer_id, v_source_record.shopify_customer_id),
  recharge_customer_id = COALESCE(v_target_record.recharge_customer_id, v_source_record.recharge_customer_id),
  recharge_subscription_id = COALESCE(v_target_record.recharge_subscription_id, v_source_record.recharge_subscription_id),
  discord_user_id = COALESCE(v_target_record.discord_user_id, v_source_record.discord_user_id),
  discord_username = COALESCE(v_target_record.discord_username, v_source_record.discord_username),
  -- Keep VIP/special flags if either has them
  is_vip = v_target_record.is_vip OR v_source_record.is_vip,
  is_influencer = v_target_record.is_influencer OR v_source_record.is_influencer,
  is_gift = v_target_record.is_gift OR v_source_record.is_gift,
  -- Sum skip/delay counts
  skip_count = COALESCE(v_target_record.skip_count, 0) + COALESCE(v_source_record.skip_count, 0),
  delay_count = COALESCE(v_target_record.delay_count, 0) + COALESCE(v_source_record.delay_count, 0),
  updated_at = NOW()
  WHERE id = p_target_id;

  -- Soft delete the source subscriber
  UPDATE subscribers
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_source_id;

  -- Soft delete source customer_story_progress records
  UPDATE customer_story_progress
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE subscriber_id = p_source_id 
    AND organization_id = p_org_id;

  -- Update subscriber_activity to point to target
  UPDATE subscriber_activity
  SET subscriber_id = p_target_id
  WHERE subscriber_id = p_source_id 
    AND organization_id = p_org_id;

  -- Update customer_discord_connections to point to target
  UPDATE customer_discord_connections
  SET subscriber_id = p_target_id
  WHERE subscriber_id = p_source_id 
    AND organization_id = p_org_id;

  -- Update discord_activity_log to point to target  
  UPDATE discord_activity_log
  SET subscriber_id = p_target_id
  WHERE subscriber_id = p_source_id 
    AND organization_id = p_org_id;

  -- Update audit_logs to point to target
  UPDATE audit_logs
  SET subscriber_id = p_target_id
  WHERE subscriber_id = p_source_id 
    AND organization_id = p_org_id;

  -- Log the merge operation
  INSERT INTO admin_audit_log (
    organization_id,
    action,
    entity_type,
    entity_id,
    secondary_entity_id,
    performed_by,
    details
  ) VALUES (
    p_org_id,
    'merge',
    'subscriber',
    p_target_id,
    p_source_id,
    p_performed_by,
    jsonb_build_object(
      'source_email', v_source_record.email,
      'target_email', v_target_record.email,
      'source_name', COALESCE(v_source_record.first_name, '') || ' ' || COALESCE(v_source_record.last_name, ''),
      'target_name', COALESCE(v_target_record.first_name, '') || ' ' || COALESCE(v_target_record.last_name, ''),
      'shipments_transferred', v_shipments_transferred,
      'keep_source_address', p_keep_source_address,
      'merge_shipments', p_merge_shipments,
      'merge_episode_history', p_merge_episode_history
    )
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'target_id', p_target_id,
    'source_id', p_source_id,
    'shipments_transferred', v_shipments_transferred,
    'progress_records_merged', v_progress_merged
  );

  RETURN v_result;
END;
$$;

-- =============================================
-- 4. Soft delete subscriber function
-- =============================================

CREATE OR REPLACE FUNCTION soft_delete_subscriber(
  p_subscriber_id UUID,
  p_org_id TEXT,
  p_performed_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscriber subscribers%ROWTYPE;
  v_shipment_count INT;
  v_progress_count INT;
BEGIN
  -- Get subscriber record
  SELECT * INTO v_subscriber
  FROM subscribers
  WHERE id = p_subscriber_id 
    AND organization_id = p_org_id 
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscriber not found or already deleted';
  END IF;

  -- Count related records
  SELECT COUNT(*) INTO v_shipment_count
  FROM shipments
  WHERE subscriber_id = p_subscriber_id;

  SELECT COUNT(*) INTO v_progress_count
  FROM customer_story_progress
  WHERE subscriber_id = p_subscriber_id AND deleted_at IS NULL;

  -- Soft delete the subscriber
  UPDATE subscribers
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_subscriber_id;

  -- Soft delete related customer_story_progress
  UPDATE customer_story_progress
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE subscriber_id = p_subscriber_id 
    AND organization_id = p_org_id;

  -- Log the delete operation
  INSERT INTO admin_audit_log (
    organization_id,
    action,
    entity_type,
    entity_id,
    performed_by,
    details
  ) VALUES (
    p_org_id,
    'delete',
    'subscriber',
    p_subscriber_id,
    p_performed_by,
    jsonb_build_object(
      'email', v_subscriber.email,
      'name', COALESCE(v_subscriber.first_name, '') || ' ' || COALESCE(v_subscriber.last_name, ''),
      'status', v_subscriber.status,
      'shipment_count', v_shipment_count,
      'progress_count', v_progress_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_subscriber_id,
    'shipment_count', v_shipment_count,
    'progress_count', v_progress_count
  );
END;
$$;

-- =============================================
-- 5. Restore deleted subscriber function
-- =============================================

CREATE OR REPLACE FUNCTION restore_subscriber(
  p_subscriber_id UUID,
  p_org_id TEXT,
  p_performed_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscriber subscribers%ROWTYPE;
BEGIN
  -- Get deleted subscriber record
  SELECT * INTO v_subscriber
  FROM subscribers
  WHERE id = p_subscriber_id 
    AND organization_id = p_org_id 
    AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deleted subscriber not found';
  END IF;

  -- Restore the subscriber
  UPDATE subscribers
  SET deleted_at = NULL,
      updated_at = NOW()
  WHERE id = p_subscriber_id;

  -- Restore related customer_story_progress
  UPDATE customer_story_progress
  SET deleted_at = NULL,
      updated_at = NOW()
  WHERE subscriber_id = p_subscriber_id 
    AND organization_id = p_org_id;

  -- Log the restore operation
  INSERT INTO admin_audit_log (
    organization_id,
    action,
    entity_type,
    entity_id,
    performed_by,
    details
  ) VALUES (
    p_org_id,
    'restore',
    'subscriber',
    p_subscriber_id,
    p_performed_by,
    jsonb_build_object(
      'email', v_subscriber.email,
      'name', COALESCE(v_subscriber.first_name, '') || ' ' || COALESCE(v_subscriber.last_name, '')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'restored_id', p_subscriber_id
  );
END;
$$;

-- =============================================
-- 6. Get subscriber deletion impact function
-- =============================================

CREATE OR REPLACE FUNCTION get_subscriber_deletion_impact(
  p_subscriber_id UUID,
  p_org_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'subscriber_id', p_subscriber_id,
    'shipment_count', (
      SELECT COUNT(*) FROM shipments 
      WHERE subscriber_id = p_subscriber_id
    ),
    'progress_count', (
      SELECT COUNT(*) FROM customer_story_progress 
      WHERE subscriber_id = p_subscriber_id AND deleted_at IS NULL
    ),
    'activity_count', (
      SELECT COUNT(*) FROM subscriber_activity 
      WHERE subscriber_id = p_subscriber_id
    ),
    'discord_connections', (
      SELECT COUNT(*) FROM customer_discord_connections 
      WHERE subscriber_id = p_subscriber_id
    ),
    'audit_logs', (
      SELECT COUNT(*) FROM audit_logs 
      WHERE subscriber_id = p_subscriber_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =============================================
-- 7. Comments for documentation
-- =============================================

COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin operations (merge, delete, edit, etc.)';
COMMENT ON COLUMN admin_audit_log.secondary_entity_id IS 'For merge operations, stores the source entity ID that was merged into the primary';
COMMENT ON COLUMN admin_audit_log.details IS 'Flexible JSONB storage for operation-specific details like emails, names, counts';

COMMENT ON FUNCTION merge_subscribers IS 'Merges two subscriber profiles, transferring all related data to the target and soft-deleting the source';
COMMENT ON FUNCTION soft_delete_subscriber IS 'Soft deletes a subscriber and related records, allowing for recovery';
COMMENT ON FUNCTION restore_subscriber IS 'Restores a previously soft-deleted subscriber';
COMMENT ON FUNCTION get_subscriber_deletion_impact IS 'Returns counts of related records that would be affected by deleting a subscriber';
