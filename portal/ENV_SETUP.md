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

# Optional: Separate credentials for public + custom apps
# Use these if you want to test on your own store now and go public later.
SHOPIFY_PUBLIC_CLIENT_ID=your-public-app-client-id
SHOPIFY_PUBLIC_CLIENT_SECRET=your-public-app-client-secret
SHOPIFY_CUSTOM_CLIENT_ID=your-custom-app-client-id
SHOPIFY_CUSTOM_CLIENT_SECRET=your-custom-app-client-secret

# Optional: Force which app credentials to use
# "public" | "custom" (if not set, the app auto-detects)
SHOPIFY_APP_VARIANT=custom
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

### OpenAI (Optional - AI Assist Features)
```
OPENAI_API_KEY=sk-...
```

The OpenAI API key enables AI-powered features in the Migration Center:
- **SKU Mapping Suggestions:** AI analyzes product names and suggests box number mappings
- **Pattern Detection:** AI identifies naming patterns in your product data
- **Flag Explanations:** AI explains why subscribers were flagged in plain English

**Note:** AI features are optional. The Migration Center works fully without them - you'll just use manual matching instead. AI assist uses the `gpt-4o-mini` model which is cost-effective (typically under $0.01 per suggestion batch).

To get an API key:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your environment variables

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
