-- SQL queries to find episode counting discrepancies
-- Run these queries against your Supabase database

-- DEBUG: Check what audit results actually say vs current box_number
SELECT
    s.email,
    s.box_number as current_box_number,
    s.migration_status,
    al.status as audit_status,
    al.proposed_next_box,
    al.detected_sequences,
    al.created_at as audit_date
FROM subscribers s
LEFT JOIN audit_logs al ON al.email = s.email
    AND al.organization_id = s.organization_id
    AND al.created_at = (
        SELECT MAX(created_at)
        FROM audit_logs al2
        WHERE al2.email = s.email AND al2.organization_id = s.organization_id
    )
WHERE s.box_number IS NOT NULL AND s.box_number > 0
ORDER BY s.email;

-- 1. Check for subscribers with field discrepancies (box_number vs current_product_sequence)
SELECT
    email,
    box_number,
    current_product_sequence,
    migration_status,
    updated_at
FROM subscribers
WHERE
    box_number IS NOT NULL
    AND box_number > 0
    AND current_product_sequence IS NOT NULL
    AND box_number != current_product_sequence
ORDER BY updated_at DESC
LIMIT 20;

-- 2. Check audit results vs actual box_number values
WITH latest_audits AS (
    SELECT DISTINCT ON (email)
        email,
        status,
        proposed_next_box,
        resolved_next_box,
        confidence_score,
        created_at,
        organization_id
    FROM audit_logs
    WHERE status IN ('clean', 'resolved')
    ORDER BY email, created_at DESC
)
SELECT
    la.email,
    la.status as audit_status,
    (COALESCE(la.resolved_next_box, la.proposed_next_box) - 1) as audited_current_episode,
    s.box_number as actual_box_number,
    s.migration_status,
    la.created_at as audit_date,
    la.confidence_score
FROM latest_audits la
JOIN subscribers s ON s.email = la.email AND s.organization_id = la.organization_id
WHERE (COALESCE(la.resolved_next_box, la.proposed_next_box) - 1) != s.box_number
ORDER BY la.created_at DESC
LIMIT 20;

-- 3. Check migration status distribution
SELECT
    migration_status,
    COUNT(*) as count
FROM subscribers
WHERE box_number IS NOT NULL AND box_number > 0
GROUP BY migration_status
ORDER BY count DESC;

-- 4. Find subscribers with unusually high episode numbers
SELECT
    email,
    box_number,
    migration_status,
    updated_at
FROM subscribers
WHERE box_number > 20
ORDER BY box_number DESC
LIMIT 10;

-- 5. Check recent audit logs for flagged records
SELECT
    email,
    status,
    flag_reasons,
    proposed_next_box,
    confidence_score,
    created_at
FROM audit_logs
WHERE status = 'flagged'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check for subscribers who haven't been audited yet
SELECT
    email,
    box_number,
    migration_status,
    created_at
FROM subscribers
WHERE
    (migration_status IS NULL OR migration_status = 'pending')
    AND box_number IS NOT NULL
    AND box_number > 0
ORDER BY created_at DESC
LIMIT 10;

-- 7. Summary statistics
SELECT
    'Total subscribers with box_number > 0' as metric,
    COUNT(*) as value
FROM subscribers
WHERE box_number IS NOT NULL AND box_number > 0

UNION ALL

SELECT
    'Subscribers with field discrepancies' as metric,
    COUNT(*) as value
FROM subscribers
WHERE
    box_number IS NOT NULL
    AND box_number > 0
    AND current_product_sequence IS NOT NULL
    AND box_number != current_product_sequence

UNION ALL

SELECT
    'Recent clean audits' as metric,
    COUNT(*) as value
FROM audit_logs
WHERE status = 'clean' AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
    'Flagged audits' as metric,
    COUNT(*) as value
FROM audit_logs
WHERE status = 'flagged';