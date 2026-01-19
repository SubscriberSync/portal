import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/checkout(.*)',
  '/checkout(.*)',
  '/terms',
  '/privacy',
  '/__clerk(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get('host') || ''
  const url = new URL(request.url)

  // Force www redirect in production (except for Clerk proxy route)
  if (host === 'subscribersync.com' && !url.pathname.startsWith('/__clerk')) {
    url.host = 'www.subscribersync.com'
    return NextResponse.redirect(url, 308)
  }

  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    const { userId } = await auth()

    // Log auth state for debugging
    console.log('[Middleware] Path:', url.pathname, 'UserId:', userId)

    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url)
      signInUrl.searchParams.set('redirect_url', url.pathname)
      return NextResponse.redirect(signInUrl)
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
