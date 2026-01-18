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
])

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get('host') || ''

  // Force www redirect in production
  if (host === 'subscribersync.com') {
    const url = new URL(request.url)
    url.host = 'www.subscribersync.com'
    return NextResponse.redirect(url, 308)
  }

  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect()
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
