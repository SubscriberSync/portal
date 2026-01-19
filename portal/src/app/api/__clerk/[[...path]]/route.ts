// Clerk proxy route for first-party cookies
// This allows Clerk's Frontend API to run on our domain

const CLERK_FRONTEND_API = 'https://frontend-api.clerk.dev'

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

  // Remove the /api/__clerk prefix and forward to Clerk's Frontend API
  const clerkPath = url.pathname.replace(/^\/api\/__clerk/, '')
  const clerkUrl = `${CLERK_FRONTEND_API}${clerkPath}${url.search}`

  // Clone headers
  const headers = new Headers(request.headers)

  // Remove host header and add required Clerk proxy headers
  headers.delete('host')
  headers.set('Clerk-Proxy-Url', 'https://www.subscribersync.com/api/__clerk')
  headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '')

  // Get the client IP from x-forwarded-for or x-real-ip
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  if (forwardedFor) {
    headers.set('X-Forwarded-For', forwardedFor)
  } else if (realIp) {
    headers.set('X-Forwarded-For', realIp)
  }

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
