import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { email, companyName } = await request.json()

    if (!email || !companyName) {
      return NextResponse.json(
        { error: 'Email and company name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate company name
    if (companyName.length < 2 || companyName.length > 100) {
      return NextResponse.json(
        { error: 'Company name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.subscribersync.com'

    const { session, slug } = await createCheckoutSession({
      email,
      companyName,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/?canceled=true`,
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      slug,
    })
  } catch (error) {
    console.error('[Create Checkout Session] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
