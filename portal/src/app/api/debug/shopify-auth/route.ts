import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Debug endpoint to diagnose Shopify + Clerk auth issues
 *
 * Call: GET /api/debug/shopify-auth?shop=your-store.myshopify.com
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop')

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    shop_param: shop,
  }

  // 1. Check Clerk auth state
  try {
    const authResult = await auth()
    diagnostics.clerk_auth = {
      userId: authResult.userId,
      orgId: authResult.orgId,
      orgSlug: authResult.orgSlug,
      orgRole: authResult.orgRole,
      sessionId: authResult.sessionId ? 'present' : null,
      sessionClaims: authResult.sessionClaims ? {
        sub: authResult.sessionClaims.sub,
        org_id: authResult.sessionClaims.org_id,
        org_slug: authResult.sessionClaims.org_slug,
      } : null,
    }
  } catch (error) {
    diagnostics.clerk_auth = {
      error: String(error),
    }
  }

  // 2. Check Supabase for org with this shop domain
  if (shop) {
    const supabase = createServiceClient()

    // Check organizations table
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('shopify_shop_domain', shop)
      .single()

    diagnostics.supabase_org = org ? {
      id: org.id,
      name: org.name,
      slug: org.slug,
      shopify_shop_domain: org.shopify_shop_domain,
      status: org.status,
      created_at: org.created_at,
    } : {
      error: orgError?.message || 'Not found',
    }

    // Check integrations table
    if (org) {
      const { data: integration, error: intError } = await supabase
        .from('integrations')
        .select('id, organization_id, type, connected, last_sync_at, credentials_encrypted')
        .eq('organization_id', org.id)
        .eq('type', 'shopify')
        .single()

      diagnostics.supabase_integration = integration ? {
        id: integration.id,
        organization_id: integration.organization_id,
        type: integration.type,
        connected: integration.connected,
        last_sync_at: integration.last_sync_at,
        has_access_token: !!(integration.credentials_encrypted as Record<string, unknown>)?.access_token,
        shop_in_creds: (integration.credentials_encrypted as Record<string, unknown>)?.shop,
        shop_email: (integration.credentials_encrypted as Record<string, unknown>)?.shop_email,
      } : {
        error: intError?.message || 'Not found',
      }
    }
  }

  // 3. Check environment
  diagnostics.environment = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SHOPIFY_APP_VARIANT: process.env.SHOPIFY_APP_VARIANT,
    has_SHOPIFY_CUSTOM_CLIENT_ID: !!process.env.SHOPIFY_CUSTOM_CLIENT_ID,
    has_SHOPIFY_PUBLIC_CLIENT_ID: !!process.env.SHOPIFY_PUBLIC_CLIENT_ID,
    has_CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  // 4. Request info
  diagnostics.request = {
    url: request.url,
    headers: {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'user-agent': request.headers.get('user-agent')?.substring(0, 100),
    },
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
