// Centralized configuration for Airtable bases and tables
// All values can be overridden via environment variables for multi-client setup

export const config = {
  airtable: {
    // API Token (required)
    token: process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || '',

    // Main client portal base (clients, intake submissions)
    portal: {
      baseId: process.env.AIRTABLE_PORTAL_BASE_ID || process.env.AIRTABLE_BASE_ID || 'appVyyEPy9cs8XBtB',
      tables: {
        clients: process.env.AIRTABLE_CLIENTS_TABLE_ID || 'tblEsjEgVXfHhARrX',
        intake: process.env.AIRTABLE_INTAKE_TABLE_ID || 'tbl9Kvgjt5q0BeIQv',
      },
    },

    // Shipping/subscribers base (for CSV export and pack mode)
    shipping: {
      baseId: process.env.AIRTABLE_SHIPPING_BASE_ID || 'appmtPTf4hLxhx437',
      tables: {
        subscribers: process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID || 'tblt9Q0GjZBN4l6Xl',
      },
    },
  },

  // Field name mappings (can be customized per client)
  fields: {
    // Client table fields
    client: {
      name: process.env.FIELD_CLIENT_NAME || 'Client',
      slug: process.env.FIELD_CLIENT_SLUG || 'Slug',
      status: process.env.FIELD_PORTAL_STATUS || 'Portal Status',
      logoUrl: process.env.FIELD_LOGO_URL || 'Logo URL',
      airtableUrl: process.env.FIELD_AIRTABLE_URL || 'Airtable URL',
      loomUrl: process.env.FIELD_LOOM_URL || 'Loom URL',
    },

    // Subscriber/shipping table fields
    subscriber: {
      firstName: process.env.FIELD_FIRST_NAME || 'First Name',
      lastName: process.env.FIELD_LAST_NAME || 'Last Name',
      email: process.env.FIELD_EMAIL || 'Email',
      phone: process.env.FIELD_PHONE || 'Phone',
      address: process.env.FIELD_ADDRESS || 'Address',
      address2: process.env.FIELD_ADDRESS_2 || 'Address 2',
      city: process.env.FIELD_CITY || 'City',
      state: process.env.FIELD_STATE || 'State',
      zip: process.env.FIELD_ZIP || 'Zip',
      country: process.env.FIELD_COUNTRY || 'Country',
      // Pack mode fields
      batch: process.env.FIELD_BATCH || 'Batch',
      box: process.env.FIELD_BOX || 'Box',
      shirtSize: process.env.FIELD_SHIRT_SIZE || 'Shirt Size',
      packed: process.env.FIELD_PACKED || 'Packed',
    },

    // Intake table fields
    intake: {
      client: process.env.FIELD_INTAKE_CLIENT || 'Client',
      item: process.env.FIELD_INTAKE_ITEM || 'Item',
      value: process.env.FIELD_INTAKE_VALUE || 'Value',
      status: process.env.FIELD_INTAKE_STATUS || 'Status',
      rejectionNote: process.env.FIELD_REJECTION_NOTE || 'Rejection Note',
    },
  },
}

// Helper to check if Airtable is configured
export function isAirtableConfigured(): boolean {
  return !!config.airtable.token
}

// Log configuration on startup (useful for debugging)
export function logConfig(): void {
  console.log('[Config] Portal Base:', config.airtable.portal.baseId)
  console.log('[Config] Shipping Base:', config.airtable.shipping.baseId)
  console.log('[Config] Token configured:', !!config.airtable.token)
}
