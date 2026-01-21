#!/usr/bin/env node

/**
 * Script to query database and find episode counting discrepancies
 *
 * This script checks for discrepancies between:
 * - box_number (used by the system)
 * - current_product_sequence (legacy field)
 * - audit results (what the forensic audit determined)
 */

const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your environment.');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function queryEpisodeDiscrepancy() {
  console.log('🔍 Querying episode counting discrepancies...\n');

  try {
    // 1. Get subscribers with episode data
    console.log('1. Checking subscriber episode data...');
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email, box_number, current_product_sequence, migration_status, organization_id')
      .neq('box_number', null)
      .neq('box_number', 0)
      .limit(50);

    if (subError) {
      console.error('Error fetching subscribers:', subError);
      return;
    }

    console.log(`Found ${subscribers.length} subscribers with box_number > 0\n`);

    // 2. Check for discrepancies between box_number and current_product_sequence
    console.log('2. Checking for field discrepancies...');
    const fieldDiscrepancies = subscribers.filter(sub =>
      sub.current_product_sequence !== null &&
      sub.current_product_sequence !== sub.box_number
    );

    if (fieldDiscrepancies.length > 0) {
      console.log(`❌ Found ${fieldDiscrepancies.length} subscribers with field discrepancies:`);
      fieldDiscrepancies.forEach(sub => {
        console.log(`  - ${sub.email}: box_number=${sub.box_number}, current_product_sequence=${sub.current_product_sequence}`);
      });
    } else {
      console.log('✅ No field discrepancies found');
    }
    console.log('');

    // 3. Check audit logs for recent results
    console.log('3. Checking recent audit results...');
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        email,
        status,
        proposed_next_box,
        resolved_next_box,
        flag_reasons,
        confidence_score,
        created_at,
        subscribers!inner(id, email, box_number, migration_status)
      `)
      .eq('status', 'clean')
      .order('created_at', { ascending: false })
      .limit(20);

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
      return;
    }

    console.log(`Found ${auditLogs.length} recent clean audit results\n`);

    // 4. Check for audit vs actual discrepancies
    console.log('4. Checking audit vs actual discrepancies...');
    const auditDiscrepancies = [];

    auditLogs.forEach(log => {
      const subscriber = log.subscribers;
      const auditedEpisode = log.proposed_next_box - 1; // proposed_next_box is next, so current is -1

      if (subscriber.box_number !== auditedEpisode) {
        auditDiscrepancies.push({
          email: log.email,
          auditedEpisode,
          actualBoxNumber: subscriber.box_number,
          auditDate: log.created_at
        });
      }
    });

    if (auditDiscrepancies.length > 0) {
      console.log(`❌ Found ${auditDiscrepancies.length} audit vs actual discrepancies:`);
      auditDiscrepancies.forEach(item => {
        console.log(`  - ${item.email}: audit says episode ${item.auditedEpisode}, but box_number is ${item.actualBoxNumber} (audited: ${item.auditDate})`);
      });
    } else {
      console.log('✅ No audit vs actual discrepancies found');
    }
    console.log('');

    // 5. Check migration status distribution
    console.log('5. Migration status distribution...');
    const statusCounts = {};
    subscribers.forEach(sub => {
      const status = sub.migration_status || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} subscribers`);
    });
    console.log('');

    // 6. Check for subscribers with high box numbers (potential issues)
    console.log('6. Checking for subscribers with high episode numbers...');
    const highEpisodeSubs = subscribers.filter(sub => sub.box_number > 10);
    if (highEpisodeSubs.length > 0) {
      console.log(`Found ${highEpisodeSubs.length} subscribers with box_number > 10:`);
      highEpisodeSubs.forEach(sub => {
        console.log(`  - ${sub.email}: episode ${sub.box_number} (${sub.migration_status})`);
      });
    } else {
      console.log('No subscribers with unusually high episode numbers');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the query
queryEpisodeDiscrepancy();