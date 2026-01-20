# Shopify App Review Submission Notes

## App Overview

**App Name:** SubscriberSync  
**Category:** Sales > Fulfillment  
**Pricing Model:** [DECISION NEEDED - see Billing section below]

SubscriberSync is a subscription box fulfillment automation platform that syncs subscriber data from Shopify and Recharge, manages shipping workflows, and integrates with email marketing platforms.

---

## Demo Store & Test Account

**Demo Store URL:** [ADD YOUR DEV STORE URL]  
Example: `subscribersync-demo.myshopify.com`

**Test Account Credentials:**  
- Email: `reviewer@subscribersync.com`  
- Password: [CREATE A TEST ACCOUNT]

**Pre-seeded Demo Data:**
- 50+ sample subscribers with various statuses
- Sample orders with different fulfillment states  
- Sample shipments in pack queue
- Connected integrations (mock data)

---

## App URLs

| URL | Purpose |
|-----|---------|
| `https://www.subscribersync.com` | Landing page |
| `https://www.subscribersync.com/privacy` | Privacy Policy |
| `https://www.subscribersync.com/terms` | Terms of Service |
| `https://www.subscribersync.com/api/shopify/install` | App install endpoint |
| `https://www.subscribersync.com/api/shopify/callback` | OAuth callback |

---

## OAuth Scopes Requested

| Scope | Purpose |
|-------|---------|
| `read_customers` | Receive customer data via webhooks for subscriber sync |
| `read_orders` | Receive order data via webhooks for shipment management |

**Why these scopes:**
- We sync customer and order data to our platform via webhooks
- We do NOT write back to Shopify - all operations are read-only
- Minimal scope approach for security

---

## Webhooks Registered

### Data Sync Webhooks
- `orders/create` - Create shipments when new orders arrive
- `orders/updated` - Update shipment status
- `orders/fulfilled` - Mark shipments as shipped
- `orders/cancelled` - Flag cancelled orders
- `customers/create` - Create subscriber records
- `customers/update` - Update subscriber information

### App Lifecycle
- `app/uninstalled` - Clean up integration on uninstall

### GDPR Compliance (Mandatory)
- `customers/data_request` - Handle customer data export requests
- `customers/redact` - Anonymize customer data on request
- `shop/redact` - Delete all shop data (48h after uninstall)

---

## Security Implementation

### OAuth Flow
1. Validate HMAC signature on install request using `crypto.timingSafeEqual`
2. Validate shop domain format with regex
3. Validate timestamp is within 5 minutes
4. Generate cryptographic state parameter for CSRF protection
5. Store state in HTTP-only, secure cookie
6. Validate state on callback
7. Exchange code for access token via Shopify API
8. Store token securely in database (encrypted column)

### Webhook Security
- All webhooks verify HMAC signature
- Per-organization webhook secrets generated on install
- Timing-safe comparison prevents timing attacks

### Data Handling on Uninstall
- Access tokens are deleted on `app/uninstalled` webhook
- GDPR `shop/redact` webhook deletes all merchant data

---

## GDPR Compliance Details

### customers/data_request
- Logs the request in activity log
- [Production: Would export customer data and send to merchant]

### customers/redact  
- Anonymizes all PII for the requested customer:
  - Email → `redacted_[id]@redacted.local`
  - Name → "REDACTED"
  - Address, phone → `null`
- Logs redaction in activity log

### shop/redact
- Cascading delete of all data in correct order:
  1. Activity logs
  2. Shipments
  3. Subscribers
  4. Integrations
  5. Discord mappings (if any)
  6. Organization record

---

## Testing Instructions for Reviewers

### Install Flow
1. Click "Add app" from Shopify App Store
2. Authorize requested permissions
3. If new user: Receive email invitation to create account
4. If existing user: Redirected directly to dashboard

### Uninstall Flow
1. Remove app from Apps section
2. Verify `app/uninstalled` webhook fires
3. Verify integration marked as disconnected
4. Verify access token is cleared

### Core Features to Test
1. **Dashboard** - View subscriber stats and recent activity
2. **Subscribers** - Search and view subscriber details
3. **Pack Mode** - Fulfillment workflow interface
4. **Settings** - Integration management

---

## Support Contact

**Email:** support@subscribersync.com  
**Direct:** travis@subscribersync.com  
**Response Time:** Within 24 hours

---

## IMPORTANT: Billing Decision Required

### Current State
The app currently uses Stripe for billing, which is NOT compliant with Shopify App Store requirements.

### Options Before Submission

**Option 1: Free Shopify App**
- List as FREE on Shopify App Store
- Billing handled separately at subscribersync.com
- Merchants sign up for paid plan outside Shopify
- Disclosure: "Free app. Paid subscription required at subscribersync.com"

**Option 2: Implement Shopify Billing API**
- Add `AppSubscription` GraphQL mutation
- Charge $49/month through Shopify
- Shopify takes 15-20% commission
- Full compliance with Shopify requirements

**Option 3: External Billing with Disclosure (Risky)**
- Some apps approved with clear disclosure in listing
- Must be VERY clear in description
- Higher rejection risk

### Recommended Approach
If you want guaranteed approval: **Option 2 (Shopify Billing)**

If you want to maintain Stripe billing: **Option 1 (Free app + external billing)**

---

## Pre-Submission Checklist

### Technical
- [x] OAuth flow with CSRF protection
- [x] HMAC validation on all requests
- [x] Webhook signature verification
- [x] Token deletion on uninstall
- [x] GDPR webhooks implemented
- [x] Minimal OAuth scopes
- [x] API version 2025-01
- [ ] Billing compliance (DECISION NEEDED)

### App Listing
- [ ] App name and tagline
- [ ] Description (80+ words)
- [ ] Key benefits (3-5 bullet points)
- [ ] Screenshots (desktop and mobile)
- [ ] App icon (1200x1200 PNG)
- [ ] Demo video (optional but recommended)
- [ ] Categories selected
- [ ] Pricing tier set
- [ ] Privacy policy URL verified
- [ ] Support contact verified

### Testing
- [ ] Create demo store with pre-seeded data
- [ ] Create test account for reviewers
- [ ] Test install flow end-to-end
- [ ] Test uninstall flow
- [ ] Test all webhook handlers
- [ ] Verify all links work
- [ ] Test on mobile viewport

---

## Files Changed for Review Compliance

1. `src/app/api/webhooks/shopify/app/route.ts`
   - Added token cleanup on uninstall

2. `src/lib/oauth.ts`
   - Reduced scopes to minimum required

3. `src/lib/shopify.ts`
   - Updated API version to 2025-01

---

## Estimated Review Timeline

- **First submission:** 5-10 business days
- **Resubmission (if rejected):** 3-5 business days
- **Tips to speed up:**
  - Provide demo store with data
  - Clear submission notes
  - Working test account
  - All links functional
  - Respond quickly to reviewer questions
