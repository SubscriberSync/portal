import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  // Landing & marketing pages
  '/',
  '/terms',
  '/privacy',
  '/case-study(.*)',

  // Auth pages
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Public API routes
  '/api/webhooks(.*)',
  '/api/checkout(.*)',
  '/api/shopify(.*)',
  '/api/debug(.*)',

  // Checkout flow
  '/checkout(.*)',

  // Testing
  '/test-auth',
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Create a response that we can modify
  let response = NextResponse.next({ request })

  // Initialize Supabase client for session refresh
  // This ensures sessions are refreshed on initial page loads before any rendering occurs
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Create new response with updated request
          response = NextResponse.next({ request })
          // Set cookies on response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh Supabase session if it exists
  // This call triggers the setAll callback if the session needs to be refreshed
  await supabase.auth.getUser()

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

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
