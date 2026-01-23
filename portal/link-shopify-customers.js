#!/usr/bin/env node

/**
 * Script to link existing subscribers to Shopify customer IDs
 * Usage: node link-shopify-customers.js
 */

// Check required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach(key => console.error(`- ${key}`));
  console.error('\nMake sure your .env.local file is properly configured.');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function linkShopifyCustomers() {
  console.log('🔗 Linking subscribers to Shopify customer IDs...\n');

  try {
    // First, get a valid session token from Clerk
    console.log('1. Getting authentication token...');

    // For now, we'll simulate the API call structure
    // In a real implementation, you'd get a proper JWT token
    const authResponse = await fetch('https://api.clerk.dev/v1/client/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // This would need proper session creation
        // For simplicity, let's try the API call directly
      })
    });

    // Alternative: Make the API call directly using service role
    // Since this is a server-side operation, we can use Supabase directly
    console.log('2. Connecting to Supabase...');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get organization info (assuming single org for simplicity)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, slug')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      throw new Error('No organization found');
    }

    const org = orgs[0];
    console.log(`3. Processing organization: ${org.slug}`);

    // Call our API endpoint
    console.log('4. Calling link API...');

    const apiUrl = `http://localhost:3000/api/migration/link-shopify-customers`;
    console.log(`API URL: ${apiUrl}`);

    // Note: This requires the Next.js server to be running
    // For now, let's implement the logic directly in this script

    console.log('5. Running customer linking logic...');

    // Get Shopify credentials
    const { data: shopifyIntegration, error: shopifyError } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', org.id)
      .eq('type', 'shopify')
      .eq('connected', true)
      .single();

    if (shopifyError || !shopifyIntegration) {
      throw new Error('Shopify integration not found or not connected');
    }

    const shopifyCreds = {
      shop: shopifyIntegration.credentials_encrypted.shop,
      access_token: shopifyIntegration.credentials_encrypted.access_token,
    };

    console.log(`Shopify shop: ${shopifyCreds.shop}`);

    // Get subscribers without shopify_customer_id
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email')
      .eq('organization_id', org.id)
      .is('shopify_customer_id', null)
      .not('email', 'is', null);

    if (subError) {
      throw new Error(`Failed to fetch subscribers: ${subError.message}`);
    }

    console.log(`Found ${subscribers.length} subscribers to link\n`);

    if (subscribers.length === 0) {
      console.log('✅ No subscribers need linking');
      return;
    }

    let linked = 0;
    let errors = 0;

    // Process in batches
    const batchSize = 5; // Smaller batch for API limits

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(subscribers.length/batchSize)} (${batch.length} subscribers)`);

      for (const subscriber of batch) {
        try {
          console.log(`  Linking ${subscriber.email}...`);

          // Search for Shopify customer by email
          const customerUrl = `https://${shopifyCreds.shop}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(subscriber.email)}`;

          const customerResponse = await fetch(customerUrl, {
            headers: {
              'X-Shopify-Access-Token': shopifyCreds.access_token,
              'Content-Type': 'application/json',
            },
          });

          if (!customerResponse.ok) {
            console.error(`    ❌ Failed to search Shopify customer: ${customerResponse.status} ${customerResponse.statusText}`);
            errors++;
            continue;
          }

          const customerData = await customerResponse.json();
          const customers = customerData.customers || [];

          if (customers.length === 1) {
            // Found exactly one match
            const customer = customers[0];

            const { error: updateError } = await supabase
              .from('subscribers')
              .update({
                shopify_customer_id: customer.id.toString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscriber.id);

            if (updateError) {
              console.error(`    ❌ Failed to update subscriber: ${updateError.message}`);
              errors++;
            } else {
              console.log(`    ✅ Linked to Shopify customer ID: ${customer.id}`);
              linked++;
            }
          } else if (customers.length > 1) {
            console.log(`    ⚠️  Multiple Shopify customers found for ${subscriber.email} - skipping`);
            errors++;
          } else {
            console.log(`    ⚠️  No Shopify customer found for ${subscriber.email}`);
            errors++;
          }

        } catch (error) {
          console.error(`    ❌ Error processing ${subscriber.email}:`, error.message);
          errors++;
        }
      }

      // Rate limiting between batches
      if (i + batchSize < subscribers.length) {
        console.log('Waiting 1 second for rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Linking complete!`);
    console.log(`✅ Linked: ${linked}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${linked + errors}`);

    if (linked > 0) {
      console.log('\n🔄 You can now run the subscriber audit!');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
linkShopifyCustomers();