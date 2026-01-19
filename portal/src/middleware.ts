import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  // Landing & marketing pages
  '/',
  '/terms',
  '/privacy',

  // Auth pages
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Public API routes
  '/api/webhooks(.*)',
  '/api/checkout(.*)',

  // Checkout flow
  '/checkout(.*)',

  // Testing (remove in production if not needed)
  '/test-auth',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
