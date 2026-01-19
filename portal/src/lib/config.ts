// Centralized configuration for the application
// All values can be overridden via environment variables

export const config = {
  // Stripe configuration
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  },

  // Discord configuration  
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    encryptionKey: process.env.DISCORD_ENCRYPTION_KEY || '',
  },

  // Recharge configuration
  recharge: {
    apiKey: process.env.RECHARGE_API_KEY || '',
  },

  // Klaviyo configuration
  klaviyo: {
    apiKey: process.env.KLAVIYO_API_KEY || '',
    publicKey: process.env.NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY || '',
  },

  // Shopify configuration
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
  },

  // ShipStation configuration
  shipstation: {
    apiKey: process.env.SHIPSTATION_API_KEY || '',
    apiSecret: process.env.SHIPSTATION_API_SECRET || '',
  },

  // Application URLs
  urls: {
    base: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
}

// Log configuration on startup (useful for debugging)
export function logConfig(): void {
  console.log('[Config] Discord configured:', !!config.discord.clientId)
  console.log('[Config] Stripe configured:', !!config.stripe.secretKey)
  console.log('[Config] Base URL:', config.urls.base)
}
