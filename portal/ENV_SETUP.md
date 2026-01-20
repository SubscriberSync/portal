# Environment Variables Setup

This portal uses Supabase for data storage and Clerk for authentication. Configure these environment variables in your Vercel project settings (or `.env.local` for local development).

## Required Variables

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_... (from Clerk Dashboard -> Webhooks)
```

### Supabase Database
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Stripe (Billing)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

### Discord Integration (Optional)
```
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ENCRYPTION_KEY=your-32-char-encryption-key
```

### Shopify Integration
```
# Shopify App credentials (from Shopify Partner Dashboard)
SHOPIFY_CLIENT_ID=your-shopify-client-id
SHOPIFY_CLIENT_SECRET=your-shopify-client-secret
```

**Shopify App Store Setup:**
When configuring your Shopify app in the Partner Dashboard, set these URLs:
- **App URL:** `https://your-domain.com/api/shopify/install`
- **Allowed redirection URLs:** `https://your-domain.com/api/shopify/callback`
- **GDPR webhooks:**
  - Customer data request: `https://your-domain.com/api/webhooks/shopify/app`
  - Customer data erasure: `https://your-domain.com/api/webhooks/shopify/app`
  - Shop data erasure: `https://your-domain.com/api/webhooks/shopify/app`

### Klaviyo Integration
```
KLAVIYO_CLIENT_ID=your-klaviyo-client-id
KLAVIYO_CLIENT_SECRET=your-klaviyo-client-secret
```

**Klaviyo App Setup:**
When configuring your Klaviyo app (at https://developers.klaviyo.com/), add this redirect URL to the allowlist:
- **OAuth Redirect URL:** `https://your-domain.com/api/auth/klaviyo/callback`

**Important:** The domain must exactly match your `NEXT_PUBLIC_APP_URL` (no www if your app uses no www).

### Recharge Integration
```
# Recharge uses API key authentication, no OAuth credentials needed
```

### Application URLs
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Important:** This URL is used for OAuth redirect URIs. It must:
- Match exactly what's configured in Klaviyo, Shopify, and other OAuth app settings
- Use the canonical domain (typically no `www.`)
- Include `https://` prefix

## Setting Up for Development

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase and Clerk credentials
3. Run migrations against your Supabase database
4. Run `npm run dev`

## Setting Up for Production

1. Create a new Vercel project
2. Add all environment variables above
3. Connect your GitHub repository
4. Deploy
