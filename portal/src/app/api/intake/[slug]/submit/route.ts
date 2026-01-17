import { NextRequest, NextResponse } from 'next/server'
import { submitIntakeItem } from '@/lib/airtable-intake'
import { IntakeItemType } from '@/lib/intake-types'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Missing client slug' }, { status: 400 })
  }
  
  try {
    const body = await request.json()
    const { item, value } = body as { item: IntakeItemType; value: string }
    
    if (!item || !value) {
      return NextResponse.json({ success: false, error: 'Missing item or value' }, { status: 400 })
    }
    
    // Validate item type
    const validItems: IntakeItemType[] = [
      'Recharge API Key',
      'Klaviyo API Key',
      'Installment Name',
    ]
    
    if (!validItems.includes(item)) {
      return NextResponse.json({ success: false, error: 'Invalid item type' }, { status: 400 })
    }
    
    const result = await submitIntakeItem({
      clientSlug: slug,
      item,
      value,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error submitting intake item:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
