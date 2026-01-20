# Migration System Redesign Plan

## Problem Statement

The current migration system assumes SKU-based matching where each episode has a unique SKU. Real-world subscription data is much messier:

1. **Product name variations** - Same product sold under different names over time
2. **Missing SKUs** - Products created without SKUs
3. **Same SKU, recurring** - Subscription apps like Recharge charge the same SKU repeatedly
4. **Tier changes** - Customer upgrades from "Ritual" to "Vault" but stays in the same story
5. **Payment changes** - Customer switches from monthly to prepaid (new subscription, same story position)
6. **Multi-subscription** - Customer has both digital and physical running simultaneously
7. **Historical mess** - Switched from Appstle to Recharge, data imported with inconsistencies

## Core Insight

**The customer email is the source of truth, not the subscription ID or SKU.**

A single customer (identified by email) may have multiple subscription records across different products/tiers, but they're all progressing through the **same story**.

## Data Model

```
STORY (e.g., "Echoes of the Crucible")
  - Has N episodes (e.g., 12)
  - Type: 'sequential' (ends after N episodes) or 'recurring' (forever)

  PRODUCT TIERS (variants that deliver the same story):
    - Ritual Box ($49.95/mo)
    - Vault Box (premium tier)
    - Digital Edition ($9.95/mo)
    - Prepaid bundles (6-12 upfront)
    - Gift subscriptions

PRODUCT VARIATIONS (raw Shopify data):
  - All the different product names/SKUs/variants found in order history
  - User groups these into Stories + Tiers

CUSTOMER (identified by email):
  - May have MULTIPLE subscription records over time
  - All feed into ONE story position per story
  - Episode # = total successful deliveries across ALL their subscriptions for this story
```

## Implementation Plan

### Phase 1: Schema Changes

**New Table: `stories`**
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,                    -- "Echoes of the Crucible"
  slug TEXT NOT NULL,                    -- "eotc"
  story_type TEXT NOT NULL,              -- 'sequential' | 'recurring'
  total_episodes INT,                    -- 12 for sequential, NULL for recurring
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New Table: `story_tiers`**
```sql
CREATE TABLE story_tiers (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  name TEXT NOT NULL,                    -- "Ritual", "Vault", "Digital"
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New Table: `product_variations`** (replaces sku_aliases)
```sql
CREATE TABLE product_variations (
  id UUID PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),

  -- Raw data from Shopify
  shopify_product_id BIGINT,
  shopify_variant_id BIGINT,
  product_name TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,

  -- User assignment
  story_id UUID REFERENCES stories(id),
  tier_id UUID REFERENCES story_tiers(id),

  -- Counts for UI display
  order_count INT DEFAULT 0,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,

  -- Metadata
  is_subscription BOOLEAN DEFAULT TRUE,  -- False for one-off addons
  is_ignored BOOLEAN DEFAULT FALSE,       -- User marked as "not a subscription product"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New Table: `customer_story_progress`** (the source of truth)
```sql
CREATE TABLE customer_story_progress (
  id UUID PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),

  -- Customer identity (email is primary key conceptually)
  customer_email TEXT NOT NULL,
  shopify_customer_ids TEXT[],            -- May have multiple over time
  recharge_customer_ids TEXT[],

  -- Story progress
  story_id UUID REFERENCES stories(id),
  current_episode INT NOT NULL DEFAULT 0,
  current_tier_id UUID REFERENCES story_tiers(id),

  -- Status
  status TEXT DEFAULT 'active',           -- 'active' | 'paused' | 'completed' | 'churned'

  -- Audit trail
  episode_history JSONB DEFAULT '[]',     -- [{episode: 1, date: '...', order_id: '...', tier: 'Ritual'}, ...]

  -- Manual overrides
  manually_adjusted BOOLEAN DEFAULT FALSE,
  adjusted_by TEXT,
  adjusted_at TIMESTAMPTZ,
  adjustment_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, customer_email, story_id)
);
```

### Phase 2: Step 1 - Map Products UI

**Goal**: Surface ALL product variations and let user group them into Stories + Tiers

**UI Flow**:
1. Show all 29 (or however many) product variations found in order history
2. Display: name, sku (if any), variant, order count, date range
3. User can:
   - Create a new Story ("Echoes of the Crucible", 12 episodes, sequential)
   - Create Tiers within a Story ("Ritual", "Vault", "Digital")
   - Drag/assign product variations to Story + Tier
   - Mark variations as "Not a subscription" (one-off addons like candles)
   - Mark variations as "Ignore" (test orders, refunds, etc.)

**Data Fetching**:
- Reuse the diagnostic endpoint logic to fetch all unique product combinations
- Store in `product_variations` table
- Show assignment status: "Unassigned" / "Assigned to EotC > Ritual"

### Phase 3: Step 2 - Import Customers

**Goal**: Build customer profiles from order history using email as the key

**Process**:
1. Fetch all orders that contain assigned product variations
2. Group by customer email
3. For each customer email:
   - Collect all Shopify customer IDs they've used
   - Collect all Recharge customer IDs (if connected)
   - Calculate episode position: count of successful orders with assigned variations
   - Detect tier changes (started Ritual, now on Vault)
   - Create `customer_story_progress` record

**Auto-flagging**:
- "Gap detected" - Missing episode (has 1, 2, 4 but not 3)
- "Multiple active subscriptions" - Has both Ritual and Vault active
- "Tier change" - Switched tiers mid-story
- "New customer" - No order history found

### Phase 4: Step 3 - Review & Adjust

**Goal**: Let user resolve flagged customers and make manual adjustments

**UI Features**:
1. List of flagged customers with reasons
2. For each customer, show:
   - Full order history timeline
   - Detected episode position
   - All subscription records (current and historical)
3. Actions:
   - Confirm detected position
   - Override episode position manually
   - Merge customers (same person, different emails)
   - Mark order as "doesn't count" (refund, test, gift)
   - Add note

### Phase 5: Episode Tracking Logic

**How to determine episode number** (in order of priority):

1. **Manual override** - If `customer_story_progress.manually_adjusted = true`, use that
2. **Episode history count** - Count entries in `episode_history` array
3. **Order count** - Count orders with assigned product variations for this customer + story

**On new order (Shopify webhook)**:
1. Match order line items to product variations
2. Find customer by email
3. Get their `customer_story_progress` for that story
4. Increment episode, add to history
5. Trigger fulfillment logic

### Implementation Order

1. **Database migration** - Add new tables
2. **Product variations fetch API** - Endpoint to scan Shopify and populate `product_variations`
3. **Step 1 UI** - Product mapping interface
4. **Customer import API** - Build `customer_story_progress` from order history
5. **Step 2 UI** - Customer review interface
6. **Step 3 UI** - Flagged customer resolution
7. **Webhook integration** - Update progress on new orders
8. **Subscriber sync** - Keep `subscribers` table in sync with `customer_story_progress`

### API Endpoints Needed

```
POST /api/migration/scan-products     - Scan Shopify orders, populate product_variations
GET  /api/migration/products          - Get all product variations with assignment status
POST /api/migration/stories           - Create a story
POST /api/migration/stories/:id/tiers - Create a tier
POST /api/migration/assign-products   - Assign product variations to story/tier
POST /api/migration/import-customers  - Build customer_story_progress from orders
GET  /api/migration/customers         - Get customers with status filters
POST /api/migration/customers/:id/adjust - Manual adjustment
POST /api/migration/customers/merge   - Merge two customer records
```

### UI Components Needed

```
IntakeStep3Products.tsx   - Product mapping interface
  - ProductVariationList.tsx
  - StoryCreator.tsx
  - TierManager.tsx
  - DragDropAssignment.tsx

IntakeStep4Customers.tsx  - Customer review interface (optional, could be step 3b)
  - CustomerList.tsx
  - CustomerDetailPanel.tsx
  - EpisodeTimeline.tsx
  - ManualAdjustForm.tsx
```

## Questions to Resolve

1. **Gift subscriptions** - How to handle? The purchaser is different from recipient
   - Proposed: Track by recipient email, not purchaser

2. **Refunds/cancellations** - Do they affect episode count?
   - Proposed: No, unless user explicitly marks as "doesn't count"

3. **Simultaneous subscriptions** - Customer has Ritual AND Digital
   - Proposed: Both increment the same episode counter (they got episode 3 twice)

4. **Mid-story tier changes** - Ritual episode 5 -> Vault episode 6
   - Proposed: Just increment, track tier in history for reference

5. **Prepaid bundles** - Customer pays for episodes 6-12 upfront
   - Proposed: This is ONE charge but N deliveries. Each delivery increments episode.
