# Environment Variables Setup

This portal is designed to be used with multiple Airtable bases. Configure these environment variables in your Vercel project settings (or `.env.local` for local development).

## Required Variables

### Airtable Authentication
```
AIRTABLE_TOKEN=pat_xxxxxxxxxxxxx
```
Your Airtable Personal Access Token. Must have access to both the portal base and shipping base.

## Base & Table IDs

### Portal Base (Clients & Intake)
```
AIRTABLE_PORTAL_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_CLIENTS_TABLE_ID=tblXXXXXXXXXXXXXX
AIRTABLE_INTAKE_TABLE_ID=tblXXXXXXXXXXXXXX
```

### Shipping Base (Subscribers & Packing)
```
AIRTABLE_SHIPPING_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_SUBSCRIBERS_TABLE_ID=tblXXXXXXXXXXXXXX
```

## Field Name Overrides (Optional)

If your Airtable uses different field names than the defaults, override them here.

### Client Table Fields
```
FIELD_CLIENT_NAME=Client
FIELD_CLIENT_SLUG=Slug
FIELD_PORTAL_STATUS=Portal Status
FIELD_LOGO_URL=Logo URL
FIELD_AIRTABLE_URL=Airtable URL
FIELD_LOOM_URL=Loom URL
```

### Subscriber/Shipping Table Fields
```
FIELD_FIRST_NAME=First Name
FIELD_LAST_NAME=Last Name
FIELD_EMAIL=Email
FIELD_PHONE=Phone
FIELD_ADDRESS=Address
FIELD_ADDRESS_2=Address 2
FIELD_CITY=City
FIELD_STATE=State
FIELD_ZIP=Zip
FIELD_COUNTRY=Country
```

### Pack Mode Fields
```
FIELD_BATCH=Batch
FIELD_BOX=Box
FIELD_SHIRT_SIZE=Shirt Size
FIELD_PACKED=Packed
```

### Intake Table Fields
```
FIELD_INTAKE_CLIENT=Client
FIELD_INTAKE_ITEM=Item
FIELD_INTAKE_VALUE=Value
FIELD_INTAKE_STATUS=Status
FIELD_REJECTION_NOTE=Rejection Note
```

## How to Get Base & Table IDs

1. Open your Airtable base
2. Look at the URL: `https://airtable.com/appXXXXXX/tblYYYYYY/viwZZZZZZ`
   - `appXXXXXX` is the **Base ID**
   - `tblYYYYYY` is the **Table ID**

## Setting Up a New Client

1. Duplicate the template Airtable base
2. Get the new Base ID and Table IDs
3. Create a new Vercel project (or add environment variables to existing)
4. Set all the environment variables above
5. Deploy

## Default Values (SubscriberSync Template)

If no environment variables are set, these defaults are used:

```
AIRTABLE_PORTAL_BASE_ID=appVyyEPy9cs8XBtB
AIRTABLE_CLIENTS_TABLE_ID=tblEsjEgVXfHhARrX
AIRTABLE_INTAKE_TABLE_ID=tbl9Kvgjt5q0BeIQv
AIRTABLE_SHIPPING_BASE_ID=appmtPTf4hLxhx437
AIRTABLE_SUBSCRIBERS_TABLE_ID=tblt9Q0GjZBN4l6Xl
```
