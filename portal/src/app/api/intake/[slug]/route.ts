import { NextRequest, NextResponse } from 'next/server'
import { getIntakeSubmissions, getClientOnboardingData } from '@/lib/airtable-intake'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  
  if (!slug) {
    return NextResponse.json({ error: 'Missing client slug' }, { status: 400 })
  }
  
  try {
    const [submissions, onboardingData] = await Promise.all([
      getIntakeSubmissions(slug),
      getClientOnboardingData(slug),
    ])
    
    if (!onboardingData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      submissions,
      onboardingData,
    })
  } catch (error) {
    console.error('Error fetching intake data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
