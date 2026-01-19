import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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

  // Testing
  '/test-auth',
])

export default clerkMiddleware(async (auth, request) => {
  // Handle Clerk invitation flow - redirect to sign-up with the ticket
  const clerkTicket = request.nextUrl.searchParams.get('__clerk_ticket')
  const clerkStatus = request.nextUrl.searchParams.get('__clerk_status')

  if (clerkTicket && (clerkStatus === 'sign_up' || clerkStatus === 'sign_in')) {
    const { userId } = await auth()

    if (!userId) {
      // User needs to sign up/in first - redirect to appropriate page with ticket
      const authUrl = new URL(clerkStatus === 'sign_up' ? '/sign-up' : '/sign-in', request.url)
      authUrl.searchParams.set('__clerk_ticket', clerkTicket)
      authUrl.searchParams.set('redirect_url', request.nextUrl.pathname)
      return NextResponse.redirect(authUrl)
    }
  }

  // Protect non-public routes using Clerk's auth.protect() (Next.js 16 pattern)
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
