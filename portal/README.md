# SubscriberSync Client Portal

Client-facing portal for SubscriberSync subscription box automation service.

## Features

- **Status Tracking**: Visual progress bar showing build status
- **Live Stats**: Subscriber counts synced from Airtable
- **Klaviyo Reference**: Quick guides for using synced data
- **Video Walkthrough**: Embedded Loom for each client
- **Support Info**: Contact and renewal information

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/SubscriberSync/portal.git
cd portal
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Add your Airtable credentials:
- `AIRTABLE_API_KEY`: Your Airtable API key
- `AIRTABLE_BASE_ID`: Your Clients base ID

### 3. Airtable Setup

Your Clients table needs these fields:
- `Company` (Primary field)
- `Slug` (URL-friendly company name, e.g., "acme-boxes")
- `Contact` (Contact name)
- `Email` (Contact email)
- `Portal Status` (Select: Paid, Access, Building, Testing, Live)
- `Total Subscribers` (Number)
- `Active Subscribers` (Number)
- `Paused Subscribers` (Number)
- `Cancelled Subscribers` (Number)
- `Go Live Date` (Date)
- `Hosting Renewal` (Date)
- `Loom URL` (URL)
- `Airtable URL` (URL - link to their dashboard)
- `Logo URL` (URL)

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/portal/acme-boxes` (demo mode without Airtable).

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Each client portal is accessible at:
`https://your-domain.vercel.app/portal/[client-slug]`

## Client URLs

Give each client their unique portal URL based on their slug:
- Acme Boxes → `/portal/acme-boxes`
- Mystery Co → `/portal/mystery-co`

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Airtable SDK
