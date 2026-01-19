import { NextRequest, NextResponse } from 'next/server'

const CLERK_FRONTEND_API = 'https://clerk.subscribersync.com'

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

  // Forward headers, but set the correct host
  const headers = new Headers(request.headers)
  headers.set('Host', 'clerk.subscribersync.com')
  headers.delete('connection')
  headers.delete('transfer-encoding')

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    // Create response with Clerk's response
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('transfer-encoding')
    responseHeaders.delete('connection')

    const responseBody = await response.arrayBuffer()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[Clerk Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Proxy error' },
      { status: 500 }
    )
  }
}
