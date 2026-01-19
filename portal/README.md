# SubscriberSync Client Portal

Client-facing portal for SubscriberSync subscription box automation service.

## Features

- **Status Tracking**: Visual progress bar showing build status
- **Live Stats**: Subscriber counts synced from Supabase
- **Onboarding Flow**: Guided OAuth setup for Shopify, Recharge, Klaviyo
- **Pack Mode**: Streamlined packing workflow for fulfillment
- **Subscriber Management**: Search and view subscriber details
- **Discord Integration**: Optional MemberLink for community management
- **Shipping Providers**: Support for ShipStation, Pirateship, or Shopify Shipping
- **Support Info**: Contact and renewal information

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/SubscriberSync/portal.git
cd portal
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Add your credentials (see ENV_SETUP.md for full list):
- Clerk authentication keys
- Supabase project URL and keys
- Stripe billing keys (optional)
- Discord integration keys (optional)

### 3. Database Setup

Run the migrations in your Supabase SQL Editor (in order):
- `supabase/migrations/001_base_schema.sql`
- `supabase/migrations/003_forensic_audit.sql`
- `supabase/migrations/004_stripe_subscriptions.sql`
- `supabase/migrations/005_discord_memberlink.sql`
- `supabase/migrations/006_discord_prompt.sql`
- `supabase/migrations/007_shipping_provider.sql`
- `supabase/migrations/008_subscriber_activity.sql`
- `supabase/migrations/009_pack_mode_schema.sql`
- `supabase/migrations/010_advanced_logistics.sql`
- `supabase/migrations/011_subscriber_stats_function.sql`

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the portal.

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Each client portal is accessible at:
`https://your-domain.vercel.app/portal/[client-slug]`

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Database)
- Clerk (Authentication)
- Stripe (Billing)
