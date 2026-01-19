import { NextRequest, NextResponse } from 'next/server'

// Get the Clerk publishable key to extract the Frontend API URL
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''

// Extract the Frontend API from the publishable key
// Format: pk_test_XXX or pk_live_XXX where XXX is base64 encoded "clerk.xxx.xxx.lcl.dev$" or similar
function getClerkFrontendApi(): string {
  try {
    // The publishable key contains encoded frontend API info
    // For production instances with custom domain, use the custom domain format
    return 'https://clerk.subscribersync.com'
  } catch {
    return 'https://clerk.subscribersync.com'
  }
}

const CLERK_FRONTEND_API = getClerkFrontendApi()

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(request, path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(request, path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(request, path)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(request, path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(request, path)
}

async function proxyToClerk(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/')
  const url = new URL(request.url)
  const targetUrl = `${CLERK_FRONTEND_API}/${path}${url.search}`

  // Get the request body for non-GET requests
  let body: BodyInit | null = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text()
  }

  // Build headers for the proxy request
  const headers = new Headers()

  // Copy essential headers
  const contentType = request.headers.get('content-type')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }

  const accept = request.headers.get('accept')
  if (accept) {
    headers.set('Accept', accept)
  }

  // Set required headers for Clerk
  headers.set('Host', 'clerk.subscribersync.com')
  headers.set('Origin', 'https://subscribersync.com')
  headers.set('X-Forwarded-Host', 'subscribersync.com')
  headers.set('X-Forwarded-Proto', 'https')

  // Forward cookies
  const cookies = request.headers.get('cookie')
  if (cookies) {
    headers.set('Cookie', cookies)
  }

  // Forward user agent
  const userAgent = request.headers.get('user-agent')
  if (userAgent) {
    headers.set('User-Agent', userAgent)
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    // Create response with Clerk's response
    const responseHeaders = new Headers()

    // Copy important response headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      // Skip hop-by-hop headers
      if (!['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'upgrade'].includes(lowerKey)) {
        responseHeaders.set(key, value)
      }
    })

    const responseBody = await response.arrayBuffer()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[Clerk Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Proxy error', details: String(error) },
      { status: 500 }
    )
  }
}
