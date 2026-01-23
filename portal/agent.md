# Unified WMS (Warehouse Management System) - Agent Context

## Project Overview
This is a comprehensive SaaS platform for subscription box fulfillment operations. It provides a unified WMS (Warehouse Management System) that integrates with e-commerce platforms to automate subscription management, inventory forecasting, packing workflows, and shipping operations.

## Tech Stack & Architecture

### Framework & Runtime
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Node.js**
- **Tailwind CSS** with custom design system
- **Tremor v4** (beta) for data visualization components

### Authentication & Authorization
- **Clerk** for user management and OAuth
- **Row Level Security (RLS)** in Supabase
- Organization-based multi-tenancy

### Database & Storage
- **Supabase** (PostgreSQL)
- **Supabase Storage** for file uploads
- **Supabase Realtime** for live updates

### Integrations
- **Shopify** (OAuth + API)
- **Recharge** (API key authentication)
- **Klaviyo** (OAuth + API)
- **ShipStation** (API v1 + v2)
- **Discord** (OAuth + API)
- **Stripe** (Billing)

### Deployment
- **Vercel** for hosting
- **Supabase** for database hosting

## Database Schema (Supabase)

### Core Tables
- **organizations** - Multi-tenant setup with shipping preferences
- **subscribers** - Customer data with subscription details
- **subscriptions** - Active subscription records
- **shipments** - Shipping records with tracking
- **products** - Product catalog with SKUs
- **sku_aliases** - SKU mapping for unknown products
- **print_batches** - Label printing batches
- **integrations** - OAuth integration credentials
- **organization_settings** - Per-org configuration

### Key Relationships
- Organizations → Subscribers → Subscriptions → Shipments
- Shipments link to Products via SKUs
- SKU aliases handle unknown/migrated products

## Key Features

### 1. Data Ingestion & Logic (The Nervous System)
- **Recharge Webhooks**: Handle subscription renewals, calculate next_box_sequence
- **Shopify Webhooks**: Capture external fulfillments, handle one-off orders
- **Smart Hold**: Pause shipments for upcoming renewals
- **Ghost Orders**: Handle externally fulfilled orders

### 2. Shipping Dashboard (The Office)
- **Provider-Aware**: Different UIs for ShipStation vs PirateShip vs 3PL vs Shopify
- **In-App Labels**: ShipStation v2 integration for rates/carriers/labels
- **CSV Export**: For PirateShip and 3PL providers
- **Sorting/Merging**: Combine multiple shipments into single orders

### 3. Pack Mode (The Garage)
- **Queue Filtering**: Shows ready_to_pack items sorted by print_sequence
- **Internal State**: Updates Supabase but doesn't trigger external APIs
- **Sidecar Alerts**: Shows add-on products and inventory needs

### 4. Migration & Integrity (The Tools)
- **Forensic Audit**: Scans Shopify history for discrepancies
- **SKU Mapper**: Interactive UI to link unknown SKUs to products
- **Episode Tracking**: Sequential box number management

### 5. Subscriber Management
- **Real-time Metrics**: Active/paused/churned counts by episode/tenure
- **Search Interface**: Find subscribers by name/email
- **Activity Logs**: Recent subscription changes

## API Structure

### Route Organization
```
/api/
├── admin/              # Admin dashboard operations
├── auth/               # OAuth integrations (Shopify, Klaviyo, Discord)
├── billing/            # Stripe billing portal
├── discord/            # Discord bot operations
├── forecasting/        # Inventory prediction
├── intake/             # Onboarding flow
├── integrations/       # Integration management
├── migration/          # Data migration tools
├── pack/               # Packing workflow
├── shipping/           # Shipping operations (rates, labels, CSV)
├── subscribers/        # Subscriber management
├── sync/               # Data synchronization
└── webhooks/           # External webhook handlers
```

### Key API Endpoints
- `/api/shipping/preferences` - GET/POST shipping provider settings
- `/api/shipping/rates` - Get ShipStation rates for shipments
- `/api/shipping/buy-labels` - Purchase shipping labels
- `/api/pack/complete` - Mark shipments as packed (internal only)
- `/api/subscribers/metrics` - Real-time subscriber analytics
- `/api/migration/audit` - Forensic audit operations

## Important Implementation Details

### Shipping Provider Logic
Each organization selects one shipping provider:
- **shipstation**: In-app label purchasing via ShipStation v2 API
- **pirateship**: CSV export for manual processing
- **shopify_shipping**: Uses Shopify's built-in shipping
- **3pl**: CSV export (identical to pirateship but different labeling)

### SKU Mapping & Unknown Products
- Unknown SKUs trigger alerts and pause shipments
- Interactive mapper UI links SKUs to existing products
- Aliases table handles migrated/changed SKUs

### Print Sequence & Merging
- Shipments get print_sequence when labels are purchased
- Pack mode filters by ready_to_pack + sorts by print_sequence
- Merging combines multiple shipments into single shipping labels

### Authentication Flow
- Clerk handles user auth, org membership
- Supabase RLS uses `org_id` from JWT
- Admin dashboard shows all organizations

## Recent Changes (Context for Future Work)

### Tremor Integration
- Replaced recharts with Tremor BarChart
- Updated StatsGrid, Forecasting, Subscribers pages
- Removed many custom chart configurations

### ShipStation v2 API
- Added in-app label purchasing
- Carriers/warehouses/rates endpoints
- Provider-aware shipping dashboard

### Admin Dashboard Enhancements
- Integration badges and delete functionality
- Better organization management
- Real-time integration status

### Subscriber Metrics
- Episode/tenure distribution charts
- Real-time analytics with product filtering
- Enhanced search and activity logs

## Development Environment

### Required Environment Variables
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Integrations
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
KLAVIYO_CLIENT_ID=...
KLAVIYO_CLIENT_SECRET=...
SHIPSTATION_API_KEY=...
SHIPSTATION_API_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# App URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Key Commands
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Code linting
- Supabase migrations in `/supabase/migrations/`

## Common Patterns

### Error Handling
- `handleApiError()` utility for consistent error responses
- All API routes use try/catch with proper error logging

### Authentication
- `{ orgSlug } = await auth()` for org-scoped operations
- `getOrganizationBySlug(orgSlug)` to get full org data
- RLS policies ensure data isolation

### Data Fetching
- Server components for initial data
- SWR for client-side caching/updates
- Real-time subscriptions for live updates

### UI Patterns
- Tremor components for data visualization
- Custom design system with CSS variables
- Provider-aware conditional rendering
- Glass morphism effects with backdrop-blur

This codebase represents a production-ready subscription fulfillment platform with enterprise integrations, real-time analytics, and comprehensive warehouse management capabilities.