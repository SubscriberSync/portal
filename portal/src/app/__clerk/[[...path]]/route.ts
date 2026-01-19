import { createClerkClient } from '@clerk/backend'

// Clerk proxy route for first-party cookies
// This allows Clerk's Frontend API to run on our domain

const CLERK_FRONTEND_API = 'https://clerk.subscribersync.com'

export async function GET(request: Request) {
  return proxyToClerk(request)
}

export async function POST(request: Request) {
  return proxyToClerk(request)
}

export async function PUT(request: Request) {
  return proxyToClerk(request)
}

export async function PATCH(request: Request) {
  return proxyToClerk(request)
}

export async function DELETE(request: Request) {
  return proxyToClerk(request)
}

async function proxyToClerk(request: Request) {
  const url = new URL(request.url)

  // Remove the /__clerk prefix and forward to Clerk's Frontend API
  const clerkPath = url.pathname.replace(/^\/__clerk/, '')
  const clerkUrl = `${CLERK_FRONTEND_API}${clerkPath}${url.search}`

  // Clone headers and remove host
  const headers = new Headers(request.headers)
  headers.delete('host')

  // Forward the request to Clerk
  const response = await fetch(clerkUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined,
  })

  // Clone the response and forward it
  const responseHeaders = new Headers(response.headers)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}
